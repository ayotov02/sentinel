import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const ENTITY_TYPES = [
  'aircraft',
  'vessel',
  'satellite',
  'person',
  'organization',
  'location',
  'event',
];

interface Props {
  filters: { types: string[] };
  onFiltersChange: (f: { types: string[] }) => void;
}

export function FacetedFilters({ filters, onFiltersChange }: Props) {
  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  };

  return (
    <div className="w-48 border-r p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Entity Type
      </h3>
      {ENTITY_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => toggleType(type)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
            filters.types.includes(type)
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50',
          )}
        >
          <span className="capitalize">{type}</span>
        </button>
      ))}
      <Separator />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Time Range
      </h3>
      {['Last Hour', 'Last 24h', 'Last 7d', 'Last 30d'].map((t) => (
        <button
          key={t}
          className="flex w-full items-center rounded-md px-2 py-1 text-xs hover:bg-accent/50 transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
