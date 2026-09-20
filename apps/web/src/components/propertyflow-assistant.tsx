'use client';

import {
  ApiError,
  type AssistantCard,
  type AssistantChatMessage,
  type AssistantWorkOrderCard,
} from '@propertyflow/api-client';
import { MAINTENANCE_PRIORITY_LABELS } from '@propertyflow/constants';
import { Bot, FileText, ImagePlus, LayoutDashboard, Send, Wrench, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const FALLBACK_HOME =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

const WELCOME: AssistantChatMessage = {
  role: 'assistant',
  content:
    'Hey — I can show vacant homes with photos, read your dashboard, explain a lease, or turn a repair photo or description into a work order.',
};

const STARTERS = [
  { label: 'Available homes', message: 'How many available homes do we have?' },
  { label: 'Dashboard', message: 'How is the dashboard looking?' },
  { label: 'My lease', message: 'Explain my lease' },
];

/** Shown after "Report a repair" so the resident picks the real problem instead of a canned one. */
const REPAIR_ISSUES = [
  'A faucet or pipe is leaking',
  'No hot water',
  'Heating or cooling is not working',
  'A drain or toilet is clogged',
  'An outlet or light stopped working',
  'An appliance is broken',
];

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AssistantUiContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const value = useContext(AssistantUiContext);
  if (!value) throw new Error('useAssistant must be used within AssistantProvider');
  return value;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AssistantUiContext.Provider value={{ open, setOpen }}>{children}</AssistantUiContext.Provider>
  );
}

export function AssistantPanel({
  className,
  docked = false,
}: {
  className?: string;
  docked?: boolean;
}) {
  const { setOpen } = useAssistant();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([WELCOME]);
  const [pickingRepair, setPickingRepair] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = useCallback(
    async (preset?: string) => {
      const message = (preset ?? draft).trim();
      if ((!message && !file) || busy) return;
      setPickingRepair(false);
      const text =
        message ||
        (file
          ? `Please review this ${file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'document' : 'photo'}.`
          : '');
      const next = [
        ...messages,
        { role: 'user' as const, content: file ? `${text}\n[${file.name}]` : text },
      ];
      setMessages(next);
      setDraft('');
      setBusy(true);
      const attached = file;
      setFile(null);
      try {
        const attachment = attached ? await fileToAttachment(attached) : undefined;
        const history = next.filter((item) => item !== WELCOME).slice(-10);
        const response = await api.chatWithAssistant({ message: text, history, attachment });
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: response.answer, cards: response.cards },
        ]);
      } catch (error) {
        const detail =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Please try again shortly.';
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: `I could not reach the assistant. ${detail}` },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, draft, file, messages],
  );

  return (
    <section
      className={cn('flex h-full min-h-0 flex-col bg-card', className)}
      aria-label="PropertyFlow assistant"
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              Homes, leases, repairs, dashboard
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className="space-y-2">
            <div
              className={cn(
                'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                item.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto border bg-background text-foreground',
              )}
            >
              {item.content}
            </div>
            {item.cards?.length ? <CardStack cards={item.cards} /> : null}
          </div>
        ))}
        {busy ? (
          <div className="mr-auto rounded-2xl border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
            Thinking…
          </div>
        ) : null}
        {messages.length === 1 && !busy ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                  onClick={() => void send(item.message)}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                aria-expanded={pickingRepair}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] hover:border-primary hover:text-foreground',
                  pickingRepair
                    ? 'border-primary bg-background text-foreground'
                    : 'bg-background text-muted-foreground',
                )}
                onClick={() => setPickingRepair((value) => !value)}
              >
                Report a repair
              </button>
            </div>
            {pickingRepair ? (
              <div className="space-y-1.5 rounded-xl border bg-background p-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Pick what is going on and I will draft the work order.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REPAIR_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      className="rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                      onClick={() => void send(`Repair needed: ${issue}`)}
                    >
                      {issue}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                    onClick={() => {
                      setPickingRepair(false);
                      input.current?.focus();
                    }}
                  >
                    Something else…
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <form
        className="shrink-0 border-t bg-card p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        {file ? (
          <div className="mb-2 flex items-center justify-between rounded-lg border bg-background px-2.5 py-1.5 text-xs">
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0];
              event.target.value = '';
              if (!next) return;
              if (next.size > 8 * 1024 * 1024) {
                toast.error('Keep attachments under 8 MB');
                return;
              }
              setFile(next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Attach photo, video, or lease PDF"
            onClick={() => picker.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask, or attach a photo…"
            aria-label="Message assistant"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || (!draft.trim() && !file)}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {docked ? null : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Attach a repair video or a lease PDF and I will draft the next step.
          </p>
        )}
      </form>
    </section>
  );
}

function CardStack({ cards }: { cards: AssistantCard[] }) {
  return (
    <div className="mr-auto w-full max-w-[92%] space-y-2">
      {cards.map((card, index) => (
        <AssistantCardView key={`${card.kind}-${index}`} card={card} />
      ))}
    </div>
  );
}

function AssistantCardView({ card }: { card: AssistantCard }) {
  if (card.kind === 'home') {
    return (
      <Link href={card.href} className="block overflow-hidden rounded-xl border bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl || FALLBACK_HOME}
          alt={card.title}
          className="h-28 w-full object-cover"
        />
        <div className="space-y-1.5 p-3">
          <p className="text-sm font-semibold leading-tight">{card.title}</p>
          <p className="text-[11px] text-muted-foreground">{card.subtitle}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {card.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className="font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Link>
    );
  }

  if (card.kind === 'metric') {
    return (
      <Link
        href={card.href || '/dashboard'}
        className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
      >
        <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{card.label}</p>
          <p className="text-sm font-semibold">{card.value}</p>
          {card.hint ? <p className="text-[11px] text-muted-foreground">{card.hint}</p> : null}
        </div>
      </Link>
    );
  }

  if (card.kind === 'lease') {
    return (
      <Link href={card.href} className="block rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{card.title}</p>
        </div>
        <dl className="mt-2 space-y-1 text-[11px]">
          {card.facts.map((fact) => (
            <div key={fact.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="text-right font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Link>
    );
  }

  return <WorkOrderCard card={card} />;
}

function WorkOrderCard({ card }: { card: AssistantWorkOrderCard }) {
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!card.leaseId) return;
    setBusy(true);
    try {
      await api.createMaintenanceRequest({
        leaseId: card.leaseId,
        title: card.title,
        description: card.description,
        priority: card.priority,
      });
      toast.success('Work order submitted');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not submit the work order');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{card.title}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {MAINTENANCE_PRIORITY_LABELS[card.priority]} priority
      </p>
      <p className="mt-2 text-xs leading-relaxed">{card.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {card.leaseId ? (
          <Button size="sm" disabled={busy} onClick={() => void submit()}>
            Submit request
          </Button>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href={card.href}>Open form</Link>
        </Button>
      </div>
    </div>
  );
}

async function fileToAttachment(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
  return { mimeType: file.type, data };
}

/** Floating launcher + sheet for public pages. Dashboard docks the panel itself. */
export function PropertyFlowAssistant() {
  const pathname = usePathname();
  const { open, setOpen } = useAssistant();
  const inDashboard = pathname.startsWith('/dashboard');

  if (inDashboard) return null;

  return (
    <>
      {open ? null : (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 h-11 rounded-full px-4 shadow-lg"
        >
          <Bot className="h-4 w-4" />
          Ask PropertyFlow
        </Button>
      )}

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-3 right-3 z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-[120%]',
        )}
      >
        <AssistantPanel />
      </aside>
    </>
  );
}
