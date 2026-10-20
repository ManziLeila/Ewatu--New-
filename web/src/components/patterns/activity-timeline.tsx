import { cn } from '@/lib/utils';

export type ActivityItem = {
  id: string;
  title: string;
  detail?: string;
  at: string;
  kind?: 'default' | 'success' | 'warning' | 'destructive';
};

const dotClass: Record<NonNullable<ActivityItem['kind']>, string> = {
  default: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export function ActivityTimeline({ items, className }: { items: ActivityItem[]; className?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity.</p>;
  }

  return (
    <ol className={cn('relative space-y-4 border-s border-border ps-4', className)}>
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              'absolute -start-[1.3rem] top-1.5 size-2.5 rounded-full ring-2 ring-card',
              dotClass[item.kind ?? 'default'],
            )}
          />
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
          <time className="text-[0.68rem] text-muted-foreground">{item.at}</time>
        </li>
      ))}
    </ol>
  );
}
