import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp, formatCoordinate, formatSpeed, formatAltitude } from '@/lib/utils';
import { Navigation, Clock, MapPin } from 'lucide-react';

interface PositionEntry {
  id: string;
  timestamp: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  source: string;
}

const SAMPLE_POSITIONS: PositionEntry[] = [
  { id: '1', timestamp: '2026-03-15T10:00:00Z', lat: 36.5000, lon: 33.2000, speed: 420, heading: 275, altitude: 11278, source: 'opensky' },
  { id: '2', timestamp: '2026-03-15T09:55:00Z', lat: 36.5120, lon: 33.2800, speed: 425, heading: 274, altitude: 11278, source: 'opensky' },
  { id: '3', timestamp: '2026-03-15T09:50:00Z', lat: 36.5250, lon: 33.3600, speed: 430, heading: 273, altitude: 11270, source: 'opensky' },
  { id: '4', timestamp: '2026-03-15T09:45:00Z', lat: 36.5400, lon: 33.4500, speed: 428, heading: 272, altitude: 11260, source: 'opensky' },
  { id: '5', timestamp: '2026-03-15T09:40:00Z', lat: 36.5500, lon: 33.5300, speed: 422, heading: 271, altitude: 11250, source: 'opensky' },
  { id: '6', timestamp: '2026-03-15T09:35:00Z', lat: 36.5600, lon: 33.6100, speed: 418, heading: 270, altitude: 11240, source: 'opensky' },
  { id: '7', timestamp: '2026-03-15T09:30:00Z', lat: 36.5700, lon: 33.7000, speed: 415, heading: 270, altitude: 11230, source: 'opensky' },
  { id: '8', timestamp: '2026-03-15T09:25:00Z', lat: 36.5800, lon: 33.7900, speed: 420, heading: 269, altitude: 11220, source: 'opensky' },
];

interface Props {
  entityId: string;
}

export function EntityTimeline({ entityId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="h-4 w-4" /> Position History
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {SAMPLE_POSITIONS.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {SAMPLE_POSITIONS.map((pos, index) => (
              <div key={pos.id} className="flex items-start gap-3 relative">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border-2 ${
                    index === 0
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(pos.timestamp)}
                    </span>
                    {index === 0 && (
                      <Badge variant="default" className="text-[10px]">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {formatCoordinate(pos.lat, pos.lon)}
                    </span>
                    {pos.speed != null && (
                      <span>{formatSpeed(pos.speed)}</span>
                    )}
                    {pos.heading != null && <span>{pos.heading}deg</span>}
                    {pos.altitude != null && (
                      <span>{formatAltitude(pos.altitude)}</span>
                    )}
                    <Badge variant="outline" className="text-[9px]">
                      {pos.source}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
