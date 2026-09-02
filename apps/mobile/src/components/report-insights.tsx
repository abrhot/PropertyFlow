import { StyleSheet, View } from 'react-native';
import { AppText, Card, Row } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';

export function CashFlowCard({
  cashFlow,
}: {
  cashFlow: { month: string; collected: number; outstanding: number }[];
}) {
  const { colors, spacing, isDark } = useTheme();
  const recent = cashFlow.slice(-6);
  const peak = Math.max(1, ...recent.map((point) => Math.max(point.collected, point.outstanding)));
  const collectedColor = colors.accent;
  const outstandingColor = isDark ? '#FFFFFF' : colors.text;

  return (
    <Card>
      <AppText variant="h2">Cash flow</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        Collected vs outstanding
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: spacing.lg }}>
        {recent.map((point) => {
          const collectedH = (point.collected / peak) * 100;
          const outstandingH = (point.outstanding / peak) * 100;
          return (
            <View key={point.month} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: '100%',
                  height: 100,
                  justifyContent: 'flex-end',
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: '22%',
                    width: 5,
                    bottom: 0,
                    height: Math.max(collectedH, point.collected > 0 ? 2 : 0),
                    backgroundColor: collectedColor,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    right: '22%',
                    width: 5,
                    bottom: 0,
                    height: Math.max(outstandingH, point.outstanding > 0 ? 2 : 0),
                    backgroundColor: outstandingH > 0 ? outstandingColor : colors.border,
                    opacity: outstandingH > 0 ? 0.85 : 0.35,
                  }}
                />
              </View>
              <AppText variant="caption" color={colors.textSubtle}>
                {point.month}
              </AppText>
            </View>
          );
        })}
      </View>

      <Row style={{ marginTop: spacing.md, gap: spacing.lg }}>
        <Legend color={collectedColor} label="Collected" />
        <Legend color={outstandingColor} label="Outstanding" />
      </Row>
    </Card>
  );
}

export function OccupancyCard({
  occupancy,
}: {
  occupancy: { property: string; occupancy: number }[];
}) {
  const { colors, spacing } = useTheme();
  return (
    <Card>
      <AppText variant="h2">Occupancy</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        By building
      </AppText>
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        {occupancy.map((entry) => (
          <View key={entry.property} style={{ gap: 8 }}>
            <Row>
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {entry.property}
              </AppText>
              <AppText variant="label">{entry.occupancy}%</AppText>
            </Row>
            <View style={{ height: 8, justifyContent: 'center' }}>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  width: `${Math.max(0, Math.min(100, entry.occupancy))}%`,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.accent,
                }}
              />
              {entry.occupancy > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: `${Math.max(0, Math.min(100, entry.occupancy))}%`,
                    marginLeft: -3,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.accent,
                  }}
                />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function MixCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { label: string; value: number; tone?: string }[];
}) {
  const { colors, spacing } = useTheme();
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card>
      <AppText variant="h2">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.textMuted}>
          {subtitle}
        </AppText>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          height: 2,
          backgroundColor: colors.border,
          marginTop: spacing.lg,
        }}
      >
        {rows.map((row) =>
          row.value > 0 && total > 0 ? (
            <View
              key={row.label}
              style={{
                flex: row.value,
                backgroundColor: row.tone ?? colors.accent,
              }}
            />
          ) : null,
        )}
      </View>

      <View style={{ gap: 10, marginTop: spacing.md }}>
        {rows.map((row) => (
          <Row key={row.label}>
            <Legend color={row.tone ?? colors.accent} label={row.label} />
            <AppText variant="label">{row.value}</AppText>
          </Row>
        ))}
      </View>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
      <View style={{ width: 8, height: 2, backgroundColor: color }} />
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}
