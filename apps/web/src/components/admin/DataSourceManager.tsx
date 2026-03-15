import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Activity, CheckCircle, AlertCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { OSINT_SOURCES } from '@/lib/constants';
import { SOURCE_STATUS_COLORS } from '@/lib/constants';
import * as api from '@/lib/api';

export function DataSourceManager() {
  const [healthData, setHealthData] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchHealth() {
      try {
        const health = await api.getSourceHealth();
        const map: Record<string, any> = {};
        for (const h of health) map[h.name] = h;
        setHealthData(map);
      } catch {}
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status?: string) => {
    if (status === 'healthy') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'degraded') return <AlertCircle className="h-4 w-4 text-amber-500" />;
    if (status === 'circuit_open') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  const formatLastPoll = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> Data Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {OSINT_SOURCES.map((source) => {
          const health = healthData[source.type];
          return (
            <div
              key={source.type}
              className="flex items-center justify-between rounded-md border p-2.5"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(health?.status)}
                <div>
                  <div className="text-sm font-medium">{source.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {source.baseUrl}
                  </div>
                  {health?.failures > 0 && (
                    <div className="text-[10px] text-red-400">
                      {health.failures} failure(s) — {health.status === 'circuit_open' ? 'circuit open' : 'degraded'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px]">
                  <Clock className="h-3 w-3 mr-1" />
                  {source.pollIntervalMs / 1000}s
                </Badge>
                {health && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatLastPoll(health.lastPoll)}
                  </span>
                )}
                <Switch checked={source.enabled} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
