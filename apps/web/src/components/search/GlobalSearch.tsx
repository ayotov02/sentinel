import { useState } from 'react';
import { Search, Sparkles, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SearchResults } from './SearchResults';
import { FacetedFilters } from './FacetedFilters';
import * as api from '@/lib/api';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<{ types: string[] }>({ types: [] });
  const [semanticMode, setSemanticMode] = useState(false);
  const [sanctionsResult, setSanctionsResult] = useState<any>(null);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);

  const handleSanctionsCheck = async () => {
    if (!query.trim()) return;
    setSanctionsLoading(true);
    try {
      const results = await api.searchSanctions(query);
      setSanctionsResult(results);
    } catch {
      setSanctionsResult([]);
    } finally {
      setSanctionsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-6 py-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              semanticMode
                ? 'Semantic search: describe what you\'re looking for...'
                : 'Search entities, events, cases, alerts...'
            }
            className="pl-11 pr-48 h-12 text-lg"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Sparkles className="h-3 w-3" />
              Semantic
              <Switch
                checked={semanticMode}
                onCheckedChange={setSemanticMode}
                className="scale-75"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSanctionsCheck}
              disabled={sanctionsLoading || !query.trim()}
            >
              <Shield className="h-3 w-3 mr-1" />
              {sanctionsLoading ? 'Checking...' : 'Sanctions'}
            </Button>
          </div>
        </div>

        {sanctionsResult && (
          <div className="mt-3 max-w-2xl">
            {sanctionsResult.length === 0 ? (
              <div className="text-xs text-green-500 flex items-center gap-1">
                <Shield className="h-3 w-3" /> No sanctions matches found
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> {sanctionsResult.length} sanctions match(es)
                </div>
                {sanctionsResult.slice(0, 5).map((r: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs bg-red-500/10 border border-red-500/30 rounded px-2 py-1"
                  >
                    {r.name || r.caption} — {r.schema || r.dataset || 'OpenSanctions'}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <FacetedFilters filters={filters} onFiltersChange={setFilters} />
        <SearchResults query={query} filters={filters} semanticMode={semanticMode} />
      </div>
    </div>
  );
}
