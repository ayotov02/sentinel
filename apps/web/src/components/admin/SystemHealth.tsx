import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Database, Cpu, HardDrive } from 'lucide-react';

export function SystemHealth() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="h-4 w-4" /> System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          {
            label: 'PostgreSQL/TimescaleDB',
            status: 'healthy',
            usage: 35,
            icon: Database,
          },
          {
            label: 'Memgraph',
            status: 'healthy',
            usage: 22,
            icon: Database,
          },
          {
            label: 'Redis',
            status: 'healthy',
            usage: 15,
            icon: HardDrive,
          },
          {
            label: 'Y-Sweet',
            status: 'healthy',
            usage: 8,
            icon: Cpu,
          },
        ].map(({ label, status, usage, icon: Icon }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Icon className="h-3 w-3" />
                {label}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {status}
              </span>
            </div>
            <Progress value={usage} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
