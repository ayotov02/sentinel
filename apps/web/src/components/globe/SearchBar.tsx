import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchEntities } from '@/hooks/useEntities';
import { useEntityStore } from '@/stores/entity-store';
import { entityColor, cn } from '@/lib/utils';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: results } = useSearchEntities(query);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  const handleSelect = (entity: any) => {
    selectEntity(entity.entity_id || entity.entityId);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative w-96">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search entities... (Ctrl+K)"
          className="pl-9 pr-8 bg-card/90 backdrop-blur-sm border-border/50"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && results && results.length > 0 && (
        <div className="absolute mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-auto">
          {results.map((entity: any) => (
            <button
              key={entity.id || entity.entity_id}
              onClick={() => handleSelect(entity)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entityColor(entity.entity_type || entity.entityType) }}
              />
              <span className="truncate">{entity.display_name || entity.displayName}</span>
              <span className="ml-auto text-xs text-muted-foreground">{entity.entity_type || entity.entityType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
