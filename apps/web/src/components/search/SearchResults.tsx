import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { entityColor } from '@/lib/utils';
import type { EntityType } from '@sentinel/shared';

const SAMPLE_RESULTS = [
  {
    type: 'entity',
    entityType: 'aircraft',
    title: 'THY123',
    subtitle: 'Turkish Airlines · ICAO-a00000',
    score: 0.95,
  },
  {
    type: 'entity',
    entityType: 'vessel',
    title: 'EVER GIVEN',
    subtitle: 'Container Ship · MMSI-123456789',
    score: 0.9,
  },
  {
    type: 'event',
    entityType: 'event',
    title: 'Armed Clash — Eastern Syria',
    subtitle: 'ACLED conflict event · 2026-03-15',
    score: 0.85,
  },
  {
    type: 'case',
    entityType: 'document',
    title: 'Operation NEPTUNE WATCH',
    subtitle: 'Case · OPEN · 12 entities',
    score: 0.8,
  },
  {
    type: 'entity',
    entityType: 'location',
    title: 'Strait of Hormuz',
    subtitle: 'Strategic chokepoint · 26.5\u00b0N, 56.2\u00b0E',
    score: 0.75,
  },
];

interface Props {
  query: string;
  filters: { types: string[] };
}

export function SearchResults({ query, filters }: Props) {
  const filtered = SAMPLE_RESULTS.filter(
    (r) => filters.types.length === 0 || filters.types.includes(r.entityType),
  );
  const results = query.length >= 2 ? filtered : [];

  return (
    <div className="flex-1 overflow-auto p-4 space-y-2">
      {results.length > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          {results.length} results for &quot;{query}&quot;
        </p>
      )}
      {results.map((r, i) => (
        <Card
          key={i}
          className="cursor-pointer hover:bg-accent/30 transition-colors"
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{
                backgroundColor: entityColor(r.entityType as EntityType),
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.subtitle}</div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {r.type}
            </Badge>
          </CardContent>
        </Card>
      ))}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No results found
        </p>
      )}
    </div>
  );
}
