import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, SkeletonCard } from '@/components/ui';
import { useTheme } from '@/features/theme/theme-context';
import { formatApiError } from '@/lib/errors';

/**
 * One consistent treatment for the three non-happy query states so every list
 * screen loads, fails, and empties out the same way.
 */
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptySubtitle,
  emptyIcon,
  emptyAction,
  onRetry,
  skeletonCount = 3,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: Parameters<typeof EmptyState>[0]['icon'];
  emptyAction?: ReactNode;
  onRetry?: () => void;
  skeletonCount?: number;
  children: ReactNode;
}) {
  const { spacing } = useTheme();

  if (isLoading) {
    return (
      <View style={{ gap: spacing.md }}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Could not load this yet"
        subtitle={formatApiError(error, 'Something went wrong.')}
        action={onRetry ? <Button label="Try again" variant="secondary" compact onPress={onRetry} /> : undefined}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon ?? 'file-tray-outline'}
        title={emptyTitle ?? 'Nothing here yet'}
        subtitle={emptySubtitle}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}
