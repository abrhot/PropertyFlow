import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestUser } from '@propertyflow/types';
import type { Env } from '../config/env.validation';
import { DashboardService } from '../dashboard/dashboard.service';
import { LeasesService } from '../leases/leases.service';
import { ListingsService } from '../listings/listings.service';
import {
  cardsFor,
  detectIntent,
  fallbackDraft,
  formatListingsText,
  toLeaseSummary,
} from './assistant-workflows';
import { PLATFORM_GUIDE } from './platform-guide';
import type {
  AssistantContext,
  AssistantListings,
  AssistantRequest,
  AssistantResponse,
  WorkOrderDraft,
} from './assistant.types';

const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'] as const;
const ALLOWED_MEDIA = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
]);

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly dashboard: DashboardService,
    private readonly listings: ListingsService,
    private readonly leases: LeasesService,
  ) {}

  async chat(user: RequestUser | undefined, input: AssistantRequest): Promise<AssistantResponse> {
    const context = await this.buildContext(user);
    const intent = detectIntent(input.message, Boolean(input.attachment));
    let answer = demoAnswer(context, input.message, intent);
    let draft = intent === 'maintenance' ? fallbackDraft(input.message) : undefined;

    if (this.config.get('GEMINI_API_KEY', { infer: true }) || this.config.get('OPENAI_API_KEY', { infer: true })) {
      try {
        answer = await this.askModel(context, input, intent);
        if (intent === 'maintenance') {
          draft = (await this.draftWorkOrder(input)) ?? draft;
        }
      } catch (error) {
        this.logger.warn(`Assistant model failed; using local guide. ${error instanceof Error ? error.message : error}`);
      }
    }

    return {
      answer,
      mode: user ? 'workspace' : 'public',
      contextUpdatedAt: context.currentTime,
      cards: cardsFor(intent, context, draft),
    };
  }

  private async buildContext(user: RequestUser | undefined): Promise<AssistantContext> {
    const currentTime = new Date().toISOString();
    const listings = await this.loadListings(user?.organizationId);
    if (!user) return { audience: 'visitor', listings, currentTime };
    const [dashboard, leaseBundle] = await Promise.all([
      this.dashboard.summary(user).catch(() => undefined),
      this.loadLeases(user),
    ]);
    return {
      audience: 'workspace-user',
      role: user.role,
      dashboard,
      listings,
      leases: leaseBundle.leases,
      defaultLeaseId: leaseBundle.defaultLeaseId,
      currentTime,
    };
  }

  private async loadListings(organizationId?: string | null): Promise<AssistantListings | undefined> {
    try {
      const { listings } = await this.listings.list({});
      const scoped = organizationId
        ? listings.filter((home) => home.organizationId === organizationId)
        : listings;
      return {
        publicCount: listings.length,
        orgCount: organizationId ? scoped.length : undefined,
        homes: scoped.slice(0, 8).map((home) => ({
          unitId: home.unitId,
          unit: home.label,
          property: home.propertyName,
          city: home.city,
          state: home.state,
          address: `${home.addressLine1}, ${home.city}, ${home.state} ${home.postalCode}`,
          bedrooms: home.bedrooms,
          bathrooms: home.bathrooms,
          squareFeet: home.squareFeet,
          rent: `$${Math.round(home.marketRentCents / 100).toLocaleString('en-US')}/mo`,
          imageUrl: home.imageUrl,
        })),
      };
    } catch (error) {
      this.logger.warn(`Could not load listings for assistant. ${error instanceof Error ? error.message : error}`);
      return undefined;
    }
  }

  private async loadLeases(user: RequestUser) {
    try {
      const { leases } = await this.leases.list(user, {});
      const summaries = leases.slice(0, 8).map(toLeaseSummary);
      const active = leases.find((lease) => lease.status === 'ACTIVE') ?? leases[0];
      return { leases: summaries, defaultLeaseId: active?.id };
    } catch {
      return { leases: [], defaultLeaseId: undefined };
    }
  }

  private async askModel(
    context: AssistantContext,
    input: AssistantRequest,
    intent: ReturnType<typeof detectIntent>,
  ): Promise<string> {
    const apiKey = this.apiKey();
    if (!apiKey) return demoAnswer(context, input.message, intent);

    const preferred = this.config.get('GEMINI_MODEL', { infer: true });
    const models = [...new Set(['gemini-3.5-flash-lite', preferred, ...FALLBACK_MODELS])];
    const canned = /I am the PropertyFlow assistant|Anyone can ask me how the platform works|Hey — ask me anything/i;
    const history = (input.history ?? [])
      .filter((item) => item.content.trim() && !canned.test(item.content))
      .slice(-10)
      .filter((item, index, list) => {
        if (index === list.length - 1 && item.role === 'user' && item.content === input.message) {
          return false;
        }
        return true;
      });

    const userParts: Array<Record<string, unknown>> = [{ text: input.message }];
    const media = normalizeAttachment(input.attachment);
    if (media) userParts.push({ inlineData: media });

    const contents = [
      ...history.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      { role: 'user', parts: userParts },
    ];

    let lastError = 'no model tried';
    for (const model of models) {
      const text = await this.generate(apiKey, model, buildInstructions(context, intent), contents);
      if (text) return text;
      lastError = `${model} empty response`;
    }
    throw new Error(lastError);
  }

  private async draftWorkOrder(input: AssistantRequest): Promise<WorkOrderDraft | undefined> {
    const apiKey = this.apiKey();
    if (!apiKey) return undefined;
    const media = normalizeAttachment(input.attachment);
    const parts: Array<Record<string, unknown>> = [
      {
        text: `Turn this resident report into a PropertyFlow work order. ${
          media ? 'Use the attached photo or video.' : ''
        } Return ONLY JSON: {"title":"short issue title","description":"clear work description","priority":"LOW"|"NORMAL"|"HIGH"|"URGENT"}\n\nReport: ${input.message}`,
      },
    ];
    if (media) parts.push({ inlineData: media });
    const preferred = this.config.get('GEMINI_MODEL', { infer: true });
    const text = await this.generate(
      apiKey,
      preferred || 'gemini-3.5-flash-lite',
      'You extract maintenance work orders. JSON only. No markdown.',
      [{ role: 'user', parts }],
    );
    if (!text) return undefined;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      const parsed = JSON.parse(match[0]) as Partial<WorkOrderDraft>;
      if (!parsed.title || !parsed.description) return undefined;
      const allowed = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
      const priority = allowed.includes(parsed.priority as (typeof allowed)[number])
        ? (parsed.priority as WorkOrderDraft['priority'])
        : 'NORMAL';
      return { title: parsed.title.slice(0, 120), description: parsed.description.slice(0, 4000), priority };
    } catch {
      return undefined;
    }
  }

  private async generate(
    apiKey: string,
    model: string,
    system: string,
    contents: unknown[],
  ): Promise<string | undefined> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 1400 },
        }),
      },
    );
    if (!response.ok) {
      if (response.status === 404) return undefined;
      throw new Error(`Assistant provider returned ${response.status}`);
    }
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() || undefined;
  }

  private apiKey() {
    return (
      this.config.get('GEMINI_API_KEY', { infer: true }) ??
      this.config.get('OPENAI_API_KEY', { infer: true })
    );
  }
}

function normalizeAttachment(attachment?: AssistantRequest['attachment']) {
  if (!attachment?.data || !ALLOWED_MEDIA.has(attachment.mimeType)) return undefined;
  const data = attachment.data.includes(',') ? attachment.data.split(',').pop() ?? '' : attachment.data;
  if (!data || data.length > 16_000_000) return undefined;
  return { mimeType: attachment.mimeType, data };
}

function buildInstructions(context: AssistantContext, intent: ReturnType<typeof detectIntent>): string {
  const roleLabel = context.role ?? 'visitor';
  const live =
    context.dashboard?.metrics?.length
      ? context.dashboard.metrics.map((metric) => `${metric.label} ${metric.value}`).join('; ')
      : 'none';
  const leases =
    context.leases?.length
      ? context.leases
          .map((lease) => `${lease.title} · ${lease.tenant} · ${lease.rent} · ${lease.start}–${lease.end} · ${lease.status}${lease.notes ? ` · ${lease.notes}` : ''}`)
          .join('\n')
      : 'none in this workspace';

  return `You are Flow, the in-app guide for PropertyFlow. Talk like a helpful coworker. ${VOICE}

Product facts (use only what you need):
${PLATFORM_GUIDE}

This person is ${
    context.audience === 'visitor'
      ? 'NOT signed in (guest). Do not invent a lease, dashboard, or rent balance for them.'
      : `SIGNED IN as ${roleLabel}. Use their live dashboard and leases below.`
  }.
Live dashboard numbers: ${live}.
Live Available Homes:
${formatListingsText(context.listings)}
Live leases they can see:
${leases}
Time: ${context.currentTime}.
Current job: ${intent}.

If they ask how many homes are available, say the live count. The UI already shows photos and details — do not tell them to go look instead of answering. If they attached a photo or video of a repair, describe what you see and the drafted work order. If they attached a lease or asked about a lease, explain the real dates, rent, and deposit above. For dashboard questions, cite the live numbers.`;
}

const VOICE = `Keep answers punchy. Lead with the action. Skip filler. No markdown bold, no parenthetical asides, no "note:" labels. Write like a text to a coworker.`;

function demoAnswer(
  context: AssistantContext,
  message: string,
  intent: ReturnType<typeof detectIntent>,
): string {
  const q = message.toLowerCase();
  const signedIn = context.audience === 'workspace-user';
  const role = context.role;

  if (/(logged in|signed in|who am i|my account|my role|am i logged)/.test(q)) {
    if (!signedIn) return 'You are not signed in — I am talking to you as a guest. Sign in and I can see your dashboard, lease, and rent.';
    return `You are signed in as ${role === 'TENANT' ? 'a resident' : role === 'ORG_ADMIN' ? 'a company admin' : role === 'PROPERTY_MANAGER' ? 'a property manager' : role === 'OWNER' ? 'an owner' : role === 'MAINTENANCE' ? 'a technician' : role}. I can see the live figures for this session.`;
  }

  if (intent === 'homes' || (/(how many|count|do we have|are there)/.test(q) && /(home|listing|vacant|available|unit)/.test(q))) {
    return listingsCountAnswer(context);
  }
  if (intent === 'dashboard') {
    if (context.dashboard?.metrics?.length) {
      const metrics = context.dashboard.metrics.map((metric) => `${metric.label} ${metric.value}`).join(' · ');
      return `Here is your live snapshot: ${metrics}.`;
    }
    return signedIn
      ? 'Dashboard is the snapshot for your role. I do not have figures loaded right now.'
      : 'Sign in and I can read your dashboard numbers.';
  }
  if (intent === 'lease') {
    if (context.leases?.length) {
      const first = context.leases[0];
      return `${first.title} is ${first.status.toLowerCase()}. Rent ${first.rent}, deposit ${first.deposit}, ${first.start} to ${first.end}.`;
    }
    return signedIn
      ? 'I do not see a lease in your workspace yet. Staff create them under Leases.'
      : 'Sign in to see your lease. Visitors can only browse Available Homes.';
  }
  if (intent === 'maintenance') {
    if (role === 'TENANT') {
      return 'I drafted a work order from what you described. Review it and submit so maintenance can pick it up.';
    }
    if (!signedIn) {
      return 'Describe the issue and I will draft a work order. Sign in as a resident or staff member to submit it.';
    }
    return 'I drafted a work order from that report. Open it to assign a unit and submit.';
  }
  if (/^(hi|hey|hello|yo|sup)\b/.test(q.trim()) || q.trim().length < 3) {
    if (!signedIn) {
      return 'Hey. Ask me for available homes and I will show photos and details. You can also ask how the product works.';
    }
    return 'Hey. I can show vacant homes, read your dashboard, explain a lease, or turn a repair description into a work order.';
  }
  if (/(sign in|login|register|account|password)/.test(q)) {
    return 'Use Sign in if you already have an account. Register creates a management company and the first admin. Forgot password is on the login screen.';
  }
  if (!signedIn) {
    return 'I can show vacant homes with photos, or explain how inquiries, rent, and repairs work. What do you want?';
  }
  return 'Give me the task — vacant homes, dashboard numbers, a lease, or a repair to turn into a work order.';
}

function listingsCountAnswer(context: AssistantContext): string {
  const listings = context.listings;
  if (!listings) return 'I could not load the catalog just now.';
  const count = listings.orgCount ?? listings.publicCount;
  if (count === 0) return 'No vacant homes are listed right now.';
  const noun = count === 1 ? 'home' : 'homes';
  return `There ${count === 1 ? 'is' : 'are'} ${count} available ${noun} right now. Photos and details are below.`;
}
