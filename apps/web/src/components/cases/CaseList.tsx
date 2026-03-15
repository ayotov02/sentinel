import { Briefcase, Plus, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/utils';

const SAMPLE_CASES = [
  { id: '1', name: 'Operation NEPTUNE WATCH', status: 'OPEN', classification: 'UNCLASSIFIED', owner: 'analyst1@sentinel.io', entityCount: 12, updatedAt: '2026-03-15T10:00:00Z', description: 'Monitoring suspicious vessel movements in the Strait of Hormuz' },
  { id: '2', name: 'DARK FLEET Investigation', status: 'IN_PROGRESS', classification: 'CUI', owner: 'analyst2@sentinel.io', entityCount: 8, updatedAt: '2026-03-14T18:30:00Z', description: 'Tracking vessels suspected of sanctions evasion via AIS manipulation' },
  { id: '3', name: 'GPS Jamming — Eastern Med', status: 'OPEN', classification: 'UNCLASSIFIED', owner: 'analyst1@sentinel.io', entityCount: 25, updatedAt: '2026-03-14T12:00:00Z', description: 'Investigating widespread GPS jamming affecting commercial aviation' },
  { id: '4', name: 'ACLED Event Cluster — Sahel', status: 'CLOSED', classification: 'UNCLASSIFIED', owner: 'analyst3@sentinel.io', entityCount: 40, updatedAt: '2026-03-13T09:00:00Z', description: 'Analysis of escalating conflict events in the Sahel region' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-500',
  IN_PROGRESS: 'bg-blue-500',
  CLOSED: 'bg-gray-500',
  ARCHIVED: 'bg-gray-400',
};

interface Props {
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function CaseList({ onSelect, onCreateNew }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> Cases
        </h2>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-1" /> New Case
        </Button>
      </div>
      {SAMPLE_CASES.map((c) => (
        <Card
          key={c.id}
          className="cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => onSelect(c.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-500'}`}
                />
                <h3 className="font-semibold text-sm">{c.name}</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{c.description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {c.status}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {c.classification}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {c.entityCount} entities
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatTimestamp(c.updatedAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
