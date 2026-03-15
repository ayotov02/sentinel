import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { useEntityStore } from '@/stores/entity-store';
import { CLASSIFICATION_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const [utcTime, setUtcTime] = useState(new Date());
  const classification = useUiStore((s) => s.classification);
  const entities = useEntityStore((s) => s.entities);

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const classColor = CLASSIFICATION_COLORS[classification] || '#22c55e';

  return (
    <div className="flex h-7 items-center justify-between border-t bg-card px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: classColor }}
          />
          {classification}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span>
          {utcTime.toISOString().replace('T', ' ').substring(0, 19)}Z
        </span>
        <span>{entities.size} entities tracked</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3 text-green-500" />
          Connected
        </span>
      </div>
    </div>
  );
}
