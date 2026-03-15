import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Eye } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

const SAMPLE_RULES = [
  {
    id: '1',
    name: 'Strait of Hormuz Geofence',
    ruleType: 'geofence',
    severity: 'HIGH',
    enabled: true,
    fireCount: 8,
    lastFired: '2026-03-15T10:45:00Z',
  },
  {
    id: '2',
    name: 'AIS Dark Period > 2hrs',
    ruleType: 'attribute',
    severity: 'CRITICAL',
    enabled: true,
    fireCount: 3,
    lastFired: '2026-03-15T08:30:00Z',
  },
  {
    id: '3',
    name: 'STS Transfer Proximity',
    ruleType: 'proximity',
    severity: 'MEDIUM',
    enabled: true,
    fireCount: 12,
    lastFired: '2026-03-15T06:15:00Z',
  },
  {
    id: '4',
    name: 'ISR Orbit Deviation',
    ruleType: 'pattern',
    severity: 'HIGH',
    enabled: false,
    fireCount: 1,
    lastFired: '2026-03-14T22:00:00Z',
  },
];

export function WatchlistManager() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Eye className="h-4 w-4" /> Watchlist Rules
      </h3>
      {SAMPLE_RULES.map((rule) => (
        <Card key={rule.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{rule.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {rule.ruleType}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {rule.severity}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Fired {rule.fireCount} times
                {rule.lastFired
                  ? ` · Last: ${formatTimestamp(rule.lastFired)}`
                  : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={rule.enabled} />
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
