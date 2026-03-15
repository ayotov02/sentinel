import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Bell } from 'lucide-react';
import { AnomalyCard } from './AnomalyCard';

export function PatternAnalyzer() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" /> Pattern of Life Analyzer
        </h2>
        <div className="flex items-center gap-2">
          <Select defaultValue="vessel">
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vessel">EVER SHADOW (Vessel)</SelectItem>
              <SelectItem value="aircraft">THY123 (Aircraft)</SelectItem>
              <SelectItem value="satellite">ISS (Satellite)</SelectItem>
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
            <div className="text-2xl font-bold">12.4 kts</div>
            <p className="text-xs text-muted-foreground">
              Normal range: 10-15 kts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <AnomalyCard />
    </div>
  );
}
