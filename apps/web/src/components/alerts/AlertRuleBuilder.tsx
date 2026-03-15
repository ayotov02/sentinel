import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield } from 'lucide-react';

export function AlertRuleBuilder() {
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState('geofence');
  const [severity, setSeverity] = useState('MEDIUM');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> Create Alert Rule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium">Rule Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Hormuz Geofence Alert"
            className="mt-1 h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Rule Type</label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geofence">Geofence</SelectItem>
                <SelectItem value="attribute">Attribute Match</SelectItem>
                <SelectItem value="correlation">Correlation</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="proximity">Proximity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Severity</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">
            Trigger Condition (JSON)
          </label>
          <Textarea
            placeholder='{"center":{"lat":26.5,"lon":56.2},"radiusKm":50}'
            className="mt-1 text-xs font-mono min-h-[60px]"
          />
        </div>
        <Button size="sm" className="w-full">
          <Plus className="h-3 w-3 mr-1" /> Create Rule
        </Button>
      </CardContent>
    </Card>
  );
}
