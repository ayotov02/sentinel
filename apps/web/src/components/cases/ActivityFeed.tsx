import { formatTimestamp } from '@/lib/utils';
import { User, Plus, AlertTriangle, FileText, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  actor: string;
  description: string;
  timestamp: string;
}

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    action: 'entity_added',
    actor: 'analyst1@sentinel.io',
    description: 'Added vessel MMSI-123456789 to case',
    timestamp: '2026-03-15T10:30:00Z',
  },
  {
    id: '2',
    action: 'note_added',
    actor: 'analyst2@sentinel.io',
    description: 'Added hypothesis about ship-to-ship transfers',
    timestamp: '2026-03-15T09:15:00Z',
  },
  {
    id: '3',
    action: 'alert_linked',
    actor: 'system',
    description: 'Alert "AIS Gap Detected" auto-linked to case',
    timestamp: '2026-03-15T06:00:00Z',
  },
  {
    id: '4',
    action: 'briefing_generated',
    actor: 'analyst1@sentinel.io',
    description: 'Generated intelligence briefing v2',
    timestamp: '2026-03-14T16:00:00Z',
  },
  {
    id: '5',
    action: 'case_created',
    actor: 'analyst1@sentinel.io',
    description: 'Created case "Operation NEPTUNE WATCH"',
    timestamp: '2026-03-14T08:00:00Z',
  },
];

const ACTION_ICONS: Record<string, LucideIcon> = {
  entity_added: Plus,
  note_added: FileText,
  alert_linked: AlertTriangle,
  briefing_generated: FileText,
  case_created: Eye,
};

export function ActivityFeed() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Activity Log</h3>
      {ACTIVITIES.map((a) => {
        const Icon = ACTION_ICONS[a.action] || User;
        return (
          <div key={a.id} className="flex items-start gap-3 text-sm">
            <div className="mt-0.5 rounded-full bg-muted p-1.5">
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1">
              <p className="text-xs">{a.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {a.actor}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTimestamp(a.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
