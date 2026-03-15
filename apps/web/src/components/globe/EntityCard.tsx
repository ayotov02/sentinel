import { X, ExternalLink, MapPin, Navigation, Gauge, ArrowUp } from 'lucide-react';
import { useEntityStore } from '@/stores/entity-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCoordinate, formatSpeed, formatAltitude, entityColor } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  entityId: string;
}

export function EntityCard({ entityId }: Props) {
  const entity = useEntityStore((s) => s.entities.get(entityId));
  const position = useEntityStore((s) => s.positions.get(entityId));
  const selectEntity = useEntityStore((s) => s.selectEntity);
  const navigate = useNavigate();

  if (!entity && !position) return null;

  const displayName = entity?.displayName || entityId;
  const entityType = entity?.entityType || position?.entityType || 'unknown';
  const color = entityColor(entityType as any);

  return (
    <Card className="w-72 bg-card/95 backdrop-blur-sm shadow-xl">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <CardTitle className="text-sm font-semibold">{displayName}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => selectEntity(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{entityType}</Badge>
          {entity?.source && <Badge variant="secondary" className="text-[10px]">{entity.source}</Badge>}
          {entity?.confidence != null && (
            <Badge variant="outline" className="text-[10px]">{Math.round(entity.confidence * 100)}%</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2 text-xs">
        {position && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{formatCoordinate(position.lat, position.lon)}</span>
              </div>
              {position.heading != null && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Navigation className="h-3 w-3" style={{ transform: `rotate(${position.heading}deg)` }} />
                  <span>{Math.round(position.heading)}°</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                <span>{formatSpeed(position.speedKts)}</span>
              </div>
              {position.altitudeM != null && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUp className="h-3 w-3" />
                  <span>{formatAltitude(position.altitudeM)}</span>
                </div>
              )}
            </div>
          </>
        )}

        {entity?.properties && Object.keys(entity.properties).length > 0 && (
          <div className="space-y-0.5 border-t pt-2">
            {Object.entries(entity.properties).slice(0, 5).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 border-t pt-2">
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => navigate(`/entities/${entity?.id || entityId}`)}>
            <ExternalLink className="mr-1 h-3 w-3" /> Profile
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => navigate('/graph')}>
            Graph
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
