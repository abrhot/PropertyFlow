import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/logo';
import { useTheme } from '@/features/theme/theme-context';
import { fontFamily, typography } from '@/theme';

type TextVariant = keyof typeof typography;

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string }) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[typography[variant], { color: color ?? colors.text }, style]}
    />
  );
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const pad = {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  };

  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[pad, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[pad, { flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {inner}
    </SafeAreaView>
  );
}

/** Centered card used by login and signup. */
export function AuthScreen({
  children,
  topRight,
}: {
  children: ReactNode;
  topRight?: ReactNode;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          minHeight: 40,
        }}
      >
        {topRight}
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}>
      {content}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  compact = false,
  inline = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  compact?: boolean;
  inline?: boolean;
}) {
  const { colors, radius, spacing } = useTheme();
  const isDisabled = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
    secondary: { bg: colors.surfaceMuted, fg: colors.text, border: colors.surfaceMuted },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
    accent: { bg: colors.accent, fg: '#FFFFFF', border: colors.accent },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          minHeight: compact ? 28 : 32,
          alignSelf: inline ? 'flex-start' : undefined,
          borderRadius: 8,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: compact || inline ? 12 : 14,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        pressed && !isDisabled ? { opacity: 0.88 } : undefined,
        isDisabled ? { opacity: 0.5 } : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon}
          <Text style={[typography.label, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="label" color={colors.text}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[
          {
            backgroundColor: colors.input,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            minHeight: 40,
            paddingVertical: 8,
            fontFamily,
            fontSize: 17,
            color: colors.text,
          },
          error ? { borderColor: colors.danger } : undefined,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const { colors, radius, spacing, isDark } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
    success: { bg: isDark ? colors.accentMuted : '#E3F0EB', fg: colors.success },
    warning: { bg: isDark ? '#2A2A2A' : '#FBF0DC', fg: isDark ? '#FFFFFF' : colors.warning },
    danger: { bg: isDark ? '#3A1F1C' : '#F7E4E0', fg: colors.danger },
    info: { bg: isDark ? '#1A2A3A' : '#E1ECF6', fg: colors.info },
  } as const;
  const c = map[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        backgroundColor: c.bg,
      }}
    >
      <Text style={[typography.caption, { color: c.fg, fontWeight: '700', textTransform: 'uppercase', fontSize: 11 }]}>
        {label}
      </Text>
    </View>
  );
}

export function BrandMark({ light = false }: { light?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm }}>
      <LogoMark size={36} inverted={light} />
      <Text
        style={[
          typography.title,
          { color: light ? '#FBF8F0' : colors.text },
        ]}
      >
        PropertyFlow
      </Text>
    </View>
  );
}

export function SegmentedTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              minHeight: 42,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              paddingHorizontal: spacing.md,
            }}
          >
            <AppText variant="label" color={active ? colors.text : colors.textSubtle}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { spacing } = useTheme();
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, style]}>{children}</View>;
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
          }}
        >
          <Ionicons name={icon} size={26} color={colors.textSubtle} />
        </View>
      ) : null}
      <AppText variant="title" color={colors.textMuted} style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color={colors.textSubtle} style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}

/** Section label with an optional right-hand action, used above lists. */
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/** Compact metric tile. Several of these sit in a `StatGrid`. */
export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  const { colors, spacing, radius } = useTheme();
  const accentColor = {
    neutral: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
  }[tone];

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '46%',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        padding: spacing.md,
        gap: 2,
      }}
    >
      <AppText variant="caption" color={colors.textSubtle} numberOfLines={1}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="h2" color={tone === 'neutral' ? colors.text : accentColor} numberOfLines={1}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>
  );
}

/** Tappable row: leading icon, title/subtitle, trailing value, chevron. */
export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  iconTone,
  right,
  onPress,
  showChevron = true,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={19} color={iconTone ?? colors.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {meta ? (
        <AppText variant="label" color={colors.textMuted} numberOfLines={1}>
          {meta}
        </AppText>
      ) : null}
      {right}
      {onPress && showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textSubtle} />
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}>
      {body}
    </Pressable>
  );
}

/** Settings row with a native switch. */
export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.accent, false: colors.borderStrong }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

/** Label/value pair for detail screens. */
export function KeyValue({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <AppText variant="body" color={colors.textMuted} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="label" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  keyboardType,
  autoCapitalize = 'none',
}: {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.input,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        minHeight: 48,
      }}
    >
      <Ionicons name="search" size={17} color={colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={{ flex: 1, fontFamily, fontSize: 17, color: colors.text, paddingVertical: spacing.sm }}
        autoCorrect={false}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface Option {
  label: string;
  value: string;
  hint?: string;
}

/** Horizontal single-select pills — good for 2–5 short options. */
export function ChipSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <AppText variant="label" color={colors.text}>
          {label}
        </AppText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={{
                borderRadius: radius.pill,
                borderWidth: 1,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                backgroundColor: active ? colors.accent : colors.surface,
                borderColor: active ? colors.accent : colors.border,
              }}
            >
              <AppText variant="label" color={active ? '#FFFFFF' : colors.textMuted}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Dropdown that opens a bottom sheet — used for long option lists. */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled,
}: {
  label?: string;
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="label" color={colors.text}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.input,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: spacing.md,
          minHeight: 40,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <AppText
          variant="body"
          color={selected ? colors.text : colors.textSubtle}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={17} color={colors.textSubtle} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Select'}>
        {options.length === 0 ? (
          <EmptyState title="Nothing to choose yet" />
        ) : (
          options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body">{option.label}</AppText>
                {option.hint ? (
                  <AppText variant="caption" color={colors.textMuted}>
                    {option.hint}
                  </AppText>
                ) : null}
              </View>
              {option.value === value ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              ) : null}
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}

/**
 * Date input backed by a JS-only month calendar. Deliberately avoids a native
 * date-picker dependency so the Android build stays unchanged.
 *
 * Value is exchanged as `yyyy-mm-dd`.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Pick a date',
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const { colors, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = parseYmd(value);
  const [cursor, setCursor] = useState(() => startOfMonth(selected ?? new Date()));

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const leadingBlanks = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function pick(day: number) {
    onChange(toYmd(new Date(cursor.getFullYear(), cursor.getMonth(), day)));
    setOpen(false);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <AppText variant="label" color={colors.text}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => {
          setCursor(startOfMonth(parseYmd(value) ?? new Date()));
          setOpen(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.input,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: spacing.md,
          minHeight: 40,
        }}
      >
        <AppText variant="body" color={selected ? colors.text : colors.textSubtle} style={{ flex: 1 }}>
          {selected
            ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : placeholder}
        </AppText>
        <Ionicons name="calendar-outline" size={18} color={colors.textSubtle} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Select date'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <AppText variant="title" style={{ flex: 1, textAlign: 'center' }}>
            {monthLabel}
          </AppText>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <AppText
              key={`${day}-${index}`}
              variant="caption"
              color={colors.textSubtle}
              style={{ flex: 1, textAlign: 'center' }}
            >
              {day}
            </AppText>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {cells.map((day, index) => {
            const isSelected =
              day != null &&
              selected != null &&
              selected.getFullYear() === cursor.getFullYear() &&
              selected.getMonth() === cursor.getMonth() &&
              selected.getDate() === day;

            return (
              <View key={index} style={{ width: `${100 / 7}%`, padding: 2 }}>
                {day == null ? (
                  <View style={{ height: 42 }} />
                ) : (
                  <Pressable
                    onPress={() => pick(day)}
                    style={{
                      height: 42,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? colors.accent : 'transparent',
                    }}
                  >
                    <AppText variant="body" color={isSelected ? '#FFFFFF' : colors.text}>
                      {day}
                    </AppText>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <Button
          label="Today"
          variant="ghost"
          onPress={() => {
            onChange(toYmd(new Date()));
            setOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toYmd(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Bottom sheet modal. Content scrolls; the backdrop dismisses. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '75%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <AppText variant="h2" style={{ flex: 1 }}>
            {title}
          </AppText>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Inline status message — errors, warnings, and confirmations in forms. */
export function Banner({
  message,
  tone = 'danger',
}: {
  message: string;
  tone?: 'danger' | 'success' | 'info' | 'warning';
}) {
  const { colors, spacing, radius, isDark } = useTheme();
  const map = {
    danger: { bg: isDark ? '#3A1F1C' : '#F7E4E0', fg: colors.danger, icon: 'alert-circle' },
    success: { bg: isDark ? colors.accentMuted : '#E3F0EB', fg: colors.success, icon: 'checkmark-circle' },
    info: { bg: isDark ? '#1A2A3A' : '#E1ECF6', fg: colors.info, icon: 'information-circle' },
    warning: { bg: isDark ? '#3A2F14' : '#FBF0DC', fg: colors.warning, icon: 'warning' },
  } as const;
  const c = map[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'flex-start',
        backgroundColor: c.bg,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={17} color={c.fg} />
      <AppText variant="caption" color={c.fg} style={{ flex: 1, lineHeight: 17 }}>
        {message}
      </AppText>
    </View>
  );
}

/** Circular initials avatar. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.accent, fontWeight: '700', fontSize: size * 0.36 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}

/** Grey placeholder block shown while a query is loading. */
export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ height, width, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }} />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  const { spacing } = useTheme();
  return (
    <Card style={{ gap: spacing.sm }}>
      <Skeleton height={18} width="55%" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={12} width={index % 2 === 0 ? '85%' : '65%'} />
      ))}
    </Card>
  );
}

/**
 * Minimal bar sparkline. Plain views rather than a charting library, which would
 * pull in SVG native code for what is a decorative trend indicator.
 */
export function Sparkline({
  values,
  height = 56,
  tone,
}: {
  values: number[];
  height?: number;
  tone?: string;
}) {
  const { colors, spacing, radius } = useTheme();
  if (values.length === 0) return null;

  const peak = Math.max(...values, 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height }}>
      {values.map((value, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: Math.max(3, (value / peak) * height),
            borderRadius: radius.sm,
            backgroundColor: tone ?? colors.accent,
            opacity: 0.35 + (0.65 * (index + 1)) / values.length,
          }}
        />
      ))}
    </View>
  );
}

/** Horizontal proportion bar used in the reports screen. */
export function MeterBar({ ratio, tone }: { ratio: number; tone?: string }) {
  const { colors, radius } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  return (
    <View style={{ height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: tone ?? colors.accent,
        }}
      />
    </View>
  );
}
