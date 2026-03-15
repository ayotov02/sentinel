import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchResults } from './SearchResults';
import { FacetedFilters } from './FacetedFilters';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<{ types: string[] }>({ types: [] });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-6 py-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities, events, cases, alerts..."
            className="pl-11 h-12 text-lg"
            autoFocus
          />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <FacetedFilters filters={filters} onFiltersChange={setFilters} />
        <SearchResults query={query} filters={filters} />
      </div>
    </div>
  );
}
