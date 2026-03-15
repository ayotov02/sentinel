import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Activity, CheckCircle, Clock } from 'lucide-react';
import { OSINT_SOURCES } from '@/lib/constants';

export function DataSourceManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> Data Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {OSINT_SOURCES.map((source) => (
          <div
            key={source.type}
            className="flex items-center justify-between rounded-md border p-2.5"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">{source.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {source.baseUrl}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                {source.pollIntervalMs / 1000}s
              </Badge>
              <Switch checked={source.enabled} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
