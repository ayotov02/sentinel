import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { entityColor } from '@/lib/utils';
import { Link2, ArrowRight } from 'lucide-react';

interface RelatedEntity {
  id: string;
  displayName: string;
  entityType: string;
  relationship: string;
  confidence: number;
  description: string;
}

const SAMPLE_RELATIONSHIPS: RelatedEntity[] = [
  {
    id: '1',
    displayName: 'EVER SHADOW',
    entityType: 'vessel',
    relationship: 'proximity_event',
    confidence: 0.92,
    description: 'Within 500m at 2026-03-14T08:00:00Z in Strait of Hormuz',
  },
  {
    id: '2',
    displayName: 'MMSI-555666777',
    entityType: 'vessel',
    relationship: 'same_owner',
    confidence: 0.78,
    description: 'Registered to same beneficial owner (Shell Corp Ltd.)',
  },
  {
    id: '3',
    displayName: 'FORTE12',
    entityType: 'aircraft',
    relationship: 'surveillance_overlap',
    confidence: 0.85,
    description: 'ISR orbit overlapped with entity track on 3 occasions',
  },
  {
    id: '4',
    displayName: 'Bandar Abbas Port',
    entityType: 'facility',
    relationship: 'port_call',
    confidence: 0.99,
    description: 'Visited port 4 times in last 30 days',
  },
  {
    id: '5',
    displayName: 'GPS-Jam-Zone-EM-1',
    entityType: 'event',
    relationship: 'spatial_correlation',
    confidence: 0.65,
    description: 'Entity transited GPS jamming zone during active jamming period',
  },
];

interface Props {
  entityId: string;
}

export function EntityRelationships({ entityId }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Related Entities
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {SAMPLE_RELATIONSHIPS.length} relationships
        </Badge>
      </div>

      {SAMPLE_RELATIONSHIPS.map((rel) => {
        const color = entityColor(rel.entityType as any);
        return (
          <Card
            key={rel.id}
            className="cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold">
                  {rel.displayName}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {rel.entityType}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="secondary" className="text-[10px]">
                  {rel.relationship.replace(/_/g, ' ')}
                </Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {Math.round(rel.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                {rel.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
