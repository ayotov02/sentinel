import { Button } from '@/components/ui/button';

const EVENT_TYPES = [
  { value: null, label: 'All' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'maritime', label: 'Maritime' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'environmental', label: 'Environmental' },
] as const;

interface Props {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}

export function TimelineFilters({ selectedType, onTypeChange }: Props) {
  return (
    <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
      <span className="text-sm font-medium mr-2">Timeline</span>
      <div className="flex gap-1">
        {EVENT_TYPES.map(({ value, label }) => (
          <Button
            key={label}
            variant={selectedType === value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onTypeChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
