import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { severityColor, formatTimestamp } from '@/lib/utils';
import { MapPin, Clock } from 'lucide-react';
import type { Severity } from '@sentinel/shared';
import type { TimelineEventData } from './TimelineView';

interface Props {
  event: TimelineEventData;
}

export function TimelineEvent({ event }: Props) {
  const color = severityColor(event.severity as Severity);

  return (
    <div className="relative">
      {/* Dot on the timeline line */}
      <div
        className="absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 border-background"
        style={{ backgroundColor: color }}
      />

      <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
        <CardContent className="p-3">
          {/* Header row: title + severity badge */}
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-sm font-semibold">{event.title}</h4>
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 ml-2"
              style={{ borderColor: color, color }}
            >
              {event.severity}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-2">
            {event.description}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(event.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {event.type}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
