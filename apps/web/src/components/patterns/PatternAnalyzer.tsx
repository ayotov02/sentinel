import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Bell, Loader2 } from 'lucide-react';
import { AnomalyCard } from './AnomalyCard';
import * as api from '@/lib/api';

export function PatternAnalyzer() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entities, setEntities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getEntities({ limit: '50' }).then(setEntities).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEntity) return;
    setLoading(true);
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    api
      .getHourlySummary(selectedEntity, start, end)
      .then((data) => {
        if (data && data.length > 0) {
          const avgSpeed =
            data.reduce((sum: number, d: any) => sum + (d.avg_speed || 0), 0) /
            data.length;
          const totalObs = data.reduce(
            (sum: number, d: any) => sum + (d.point_count || 0),
            0,
          );
          setSummary({ avgSpeed, totalObs, buckets: data.length });
        } else {
          setSummary(null);
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [selectedEntity]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" /> Pattern of Life Analyzer
        </h2>
        <div className="flex items-center gap-2">
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Select entity..." />
            </SelectTrigger>
            <SelectContent>
              {entities.slice(0, 20).map((e: any) => (
                <SelectItem key={e.entityId} value={e.entityId}>
                  {e.displayName} ({e.entityType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Bell className="h-3 w-3 mr-1" /> Set Baseline
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Avg Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary ? `${summary.avgSpeed.toFixed(1)} kts` : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary ? `From ${summary.buckets} time buckets` : 'Select an entity'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {summary ? summary.totalObs.toLocaleString() : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AnomalyCard />
    </div>
  );
}
