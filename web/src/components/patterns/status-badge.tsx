import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusKind = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'accent';

const variantMap: Record<StatusKind, BadgeProps['variant']> = {
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  info: 'info',
  muted: 'muted',
  accent: 'accent',
};

const toneClass: Record<StatusKind, string> = {
  success: '',
  warning: 'border-warning/40 bg-warning/15 text-warning-foreground',
  destructive: '',
  info: 'border-info/40 bg-info/15 text-info-foreground',
  muted: '',
  accent: '',
};

export function StatusBadge({
  kind,
  children,
  className,
}: {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant={variantMap[kind]} className={cn(toneClass[kind], className)}>
      {children}
    </Badge>
  );
}
