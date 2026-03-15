import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { entityColor } from '@/lib/utils';
import type { EntityType } from '@sentinel/shared';

const SAMPLE_EXTRACTIONS = [
  {
    type: 'person',
    value: 'General Soleimani',
    confidence: 0.85,
    context: '...commanded by General Soleimani...',
  },
  {
    type: 'organization',
    value: 'IRGC Navy',
    confidence: 0.92,
    context: '...the IRGC Navy deployed vessels...',
  },
  {
    type: 'location',
    value: 'Strait of Hormuz',
    confidence: 0.98,
    context: '...operations in the Strait of Hormuz...',
  },
  {
    type: 'vessel',
    value: 'SABITI',
    confidence: 0.75,
    context: '...tanker SABITI was observed...',
  },
  {
    type: 'event',
    value: 'missile strike',
    confidence: 0.6,
    context: '...following the missile strike on...',
  },
];

export function ExtractionReview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Extraction Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {SAMPLE_EXTRACTIONS.map((e, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border p-2">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: entityColor(e.type as EntityType),
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{e.value}</span>
                <Badge variant="outline" className="text-[10px]">
                  {e.type}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {Math.round(e.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {e.context}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-green-500"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button className="w-full mt-2" size="sm">
          Confirm All Entities
        </Button>
      </CardContent>
    </Card>
  );
}
