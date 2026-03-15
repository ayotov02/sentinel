import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain } from 'lucide-react';

export function AnomalyCard() {
  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold">
                Route Deviation Detected
              </h4>
              <Badge
                variant="outline"
                className="text-[10px] border-yellow-500 text-yellow-500"
              >
                MEDIUM
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Vessel deviated 15nm from established route pattern at 26.3°N,
              55.8°E. This location coincides with a known anchorage used for
              ship-to-ship transfers.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" /> AI Explanation: Pattern consistent
              with potential STS transfer rendezvous. Historical data shows 3
              similar deviations in past 60 days.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
