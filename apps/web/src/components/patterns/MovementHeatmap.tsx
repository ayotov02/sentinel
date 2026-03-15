import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

export function MovementHeatmap() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Map className="h-4 w-4" /> Movement Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[200px] rounded-md border border-dashed bg-muted/30">
          <div className="text-center">
            <Map className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              H3 hexagonal heatmap visualization
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Renders density of position reports over selected time range using
              deck.gl H3HexagonLayer
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
