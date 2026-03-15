import { Eye, EyeOff, ChevronDown, ChevronRight, Plane, Ship, Satellite, Zap, Flame, AlertTriangle, Wifi } from 'lucide-react';
import { useFilterStore } from '@/stores/filter-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const LAYER_GROUPS = [
  {
    name: 'Kinetic',
    layers: [
      { key: 'aircraft' as const, label: 'Aircraft', icon: Plane, color: '#3b82f6' },
      { key: 'vessel' as const, label: 'Vessels', icon: Ship, color: '#10b981' },
      { key: 'satellite' as const, label: 'Satellites', icon: Satellite, color: '#8b5cf6' },
    ],
  },
  {
    name: 'Events',
    layers: [
      { key: 'event' as const, label: 'Events', icon: Zap, color: '#f97316' },
      { key: 'fire' as const, label: 'Fires', icon: Flame, color: '#ef4444' },
      { key: 'notam' as const, label: 'NOTAMs', icon: AlertTriangle, color: '#f59e0b' },
      { key: 'outage' as const, label: 'Outages', icon: Wifi, color: '#06b6d4' },
    ],
  },
];

export function LayerPanel() {
  const { layers, opacity, toggleLayer, setLayerOpacity } = useFilterStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Kinetic', 'Events']));

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Card className="w-64 bg-card/95 backdrop-blur-sm">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium">Layers</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {LAYER_GROUPS.map((group) => (
          <div key={group.name}>
            <button
              onClick={() => toggleGroup(group.name)}
              className="flex w-full items-center gap-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {expandedGroups.has(group.name) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {group.name}
            </button>

            {expandedGroups.has(group.name) && (
              <div className="space-y-1.5 pl-2">
                {group.layers.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-xs">{label}</span>
                      </div>
                      <Switch
                        checked={layers[key]}
                        onCheckedChange={() => toggleLayer(key)}
                        className="h-4 w-7"
                      />
                    </div>
                    {layers[key] && (
                      <Slider
                        value={[opacity[key] * 100]}
                        onValueChange={([v]) => setLayerOpacity(key, v / 100)}
                        max={100}
                        step={5}
                        className="h-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <Separator className="my-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
