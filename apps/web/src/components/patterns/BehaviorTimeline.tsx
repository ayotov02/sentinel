import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function BehaviorTimeline() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> Behavior Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[200px] rounded-md border border-dashed bg-muted/30">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Temporal behavior pattern visualization
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Displays speed, heading, and port visits over time using Recharts
              ComposedChart
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
