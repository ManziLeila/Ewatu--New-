import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type SavedFilter = { id: string; label: string };

export function SavedFilterChips({
  filters,
  activeId,
  onSelect,
  onClear,
}: {
  filters: SavedFilter[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Views</span>
      {filters.map((f) => (
        <button key={f.id} type="button" onClick={() => onSelect(f.id)}>
          <Badge variant={activeId === f.id ? 'default' : 'outline'}>{f.label}</Badge>
        </button>
      ))}
      {activeId ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="me-1 size-3.5" /> Clear
        </Button>
      ) : null}
    </div>
  );
}
