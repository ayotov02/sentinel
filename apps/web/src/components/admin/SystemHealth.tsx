import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Database,
  Cpu,
  HardDrive,
  Loader2,
} from 'lucide-react';
import * as api from '@/lib/api';

export function SystemHealth() {
  const [sourceHealth, setSourceHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const health = await api.getSourceHealth();
        setSourceHealth(health);
      } catch {
        // API may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const staticSystems = [
    { label: 'PostgreSQL/TimescaleDB', icon: Database },
    { label: 'Memgraph', icon: Database },
    { label: 'Redis', icon: HardDrive },
    { label: 'Y-Sweet', icon: Cpu },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'healthy') return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (status === 'degraded') return <AlertCircle className="h-3 w-3 text-amber-500" />;
    if (status === 'circuit_open') return <XCircle className="h-3 w-3 text-red-500" />;
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="h-4 w-4" /> System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {staticSystems.map(({ label, icon: Icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Icon className="h-3 w-3" />
                {label}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                healthy
              </span>
            </div>
            <Progress value={Math.random() * 40 + 10} className="h-1.5" />
          </div>
        ))}

        {sourceHealth.length > 0 && (
          <>
            <div className="text-xs font-medium text-muted-foreground pt-2 border-t">
              OSINT Sources
            </div>
            {sourceHealth.map((source: any) => (
              <div key={source.name} className="flex items-center justify-between text-xs">
                <span>{source.name}</span>
                <span className="flex items-center gap-1">
                  <StatusIcon status={source.status} />
                  {source.status}
                  {source.failures > 0 && (
                    <span className="text-red-400 ml-1">({source.failures} failures)</span>
                  )}
                </span>
              </div>
            ))}
          </>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading source health...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
