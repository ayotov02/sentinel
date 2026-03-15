import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare } from 'lucide-react';

export function RouteComparison() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4" /> Route Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[200px] rounded-md border border-dashed bg-muted/30">
          <div className="text-center">
            <GitCompare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              Route deviation comparison view
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Overlays historical baseline route with current track to highlight
              deviations
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
