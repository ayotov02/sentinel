import { useState, useMemo } from 'react';
import { TimelineEvent } from './TimelineEvent';
import { TimelineFilters } from './TimelineFilters';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TimelineEventData {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  severity: string;
  location: string;
  description: string;
}

// Sample events - in production would come from API
const SAMPLE_EVENTS: TimelineEventData[] = [
  {
    id: '1',
    type: 'conflict',
    title: 'Armed Clash Reported',
    timestamp: '2026-03-15T08:30:00Z',
    severity: 'HIGH',
    location: 'Eastern Syria',
    description:
      'Clash between armed groups reported near Deir ez-Zor',
  },
  {
    id: '2',
    type: 'maritime',
    title: 'Vessel AIS Gap Detected',
    timestamp: '2026-03-15T06:15:00Z',
    severity: 'MEDIUM',
    location: 'Strait of Hormuz',
    description: 'Vessel MMSI-123456789 went dark for 4 hours',
  },
  {
    id: '3',
    type: 'aviation',
    title: 'Unusual Flight Pattern',
    timestamp: '2026-03-15T04:00:00Z',
    severity: 'LOW',
    location: 'Eastern Mediterranean',
    description: 'Aircraft THY123 deviated from standard route',
  },
  {
    id: '4',
    type: 'cyber',
    title: 'Internet Outage Detected',
    timestamp: '2026-03-14T22:00:00Z',
    severity: 'MEDIUM',
    location: 'Iran - Isfahan Province',
    description: 'Significant drop in internet connectivity',
  },
  {
    id: '5',
    type: 'conflict',
    title: 'Explosion Reported',
    timestamp: '2026-03-14T18:45:00Z',
    severity: 'CRITICAL',
    location: 'Baghdad, Iraq',
    description: 'Large explosion reported near Green Zone',
  },
  {
    id: '6',
    type: 'environmental',
    title: 'Large Fire Detected',
    timestamp: '2026-03-14T14:20:00Z',
    severity: 'MEDIUM',
    location: 'Sudan - Darfur',
    description: 'FIRMS detected significant thermal anomaly',
  },
  {
    id: '7',
    type: 'maritime',
    title: 'Vessel Proximity Alert',
    timestamp: '2026-03-14T10:00:00Z',
    severity: 'HIGH',
    location: 'Red Sea',
    description: 'Two flagged vessels within 500m',
  },
  {
    id: '8',
    type: 'aviation',
    title: 'GPS Jamming Suspected',
    timestamp: '2026-03-14T07:30:00Z',
    severity: 'HIGH',
    location: 'Eastern Turkey',
    description:
      'NACp degradation detected for multiple aircraft',
  },
];

export function TimelineView() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selectedType) return SAMPLE_EVENTS;
    return SAMPLE_EVENTS.filter((e) => e.type === selectedType);
  }, [selectedType]);

  return (
    <div className="flex h-full flex-col">
      <TimelineFilters
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />
      <ScrollArea className="flex-1 p-4">
        <div className="relative ml-4 border-l-2 border-border pl-6 space-y-4">
          {filtered.map((event) => (
            <TimelineEvent key={event.id} event={event} />
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No events match the selected filter.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
