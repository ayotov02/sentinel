import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTimestamp } from '@/lib/utils';
import { History } from 'lucide-react';

const SAMPLE_LOGS = [
  {
    actor: 'analyst1@sentinel.io',
    action: 'entity.create',
    resource: 'MMSI-987654321',
    timestamp: '2026-03-15T10:45:00Z',
  },
  {
    actor: 'system',
    action: 'alert.fire',
    resource: 'Geofence Alert #12',
    timestamp: '2026-03-15T10:45:00Z',
  },
  {
    actor: 'analyst2@sentinel.io',
    action: 'case.update',
    resource: 'Operation NEPTUNE WATCH',
    timestamp: '2026-03-15T09:30:00Z',
  },
  {
    actor: 'analyst1@sentinel.io',
    action: 'briefing.generate',
    resource: 'Briefing #5',
    timestamp: '2026-03-15T08:00:00Z',
  },
  {
    actor: 'admin@sentinel.io',
    action: 'user.create',
    resource: 'viewer@sentinel.io',
    timestamp: '2026-03-15T07:00:00Z',
  },
  {
    actor: 'system',
    action: 'osint.poll',
    resource: 'OpenSky Network',
    timestamp: '2026-03-15T06:00:00Z',
  },
];

export function AuditLog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {SAMPLE_LOGS.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
              >
                <span className="text-muted-foreground w-36 shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {log.action}
                </Badge>
                <span className="font-medium truncate">{log.resource}</span>
                <span className="text-muted-foreground ml-auto shrink-0">
                  {log.actor}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
