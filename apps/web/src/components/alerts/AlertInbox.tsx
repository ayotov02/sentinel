import { useState } from 'react';
import { AlertCard } from './AlertCard';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Filter } from 'lucide-react';

const SAMPLE_ALERTS = [
  {
    id: '1',
    alertType: 'geofence',
    severity: 'HIGH',
    title: 'Vessel entered restricted zone',
    description: 'MMSI-987654321 entered Strait of Hormuz exclusion zone',
    entityId: 'MMSI-987654321',
    status: 'NEW',
    createdAt: '2026-03-15T10:45:00Z',
  },
  {
    id: '2',
    alertType: 'attribute',
    severity: 'CRITICAL',
    title: 'AIS transponder disabled',
    description: 'Vessel EVER SHADOW AIS signal lost for 2+ hours',
    entityId: 'MMSI-123456789',
    status: 'NEW',
    createdAt: '2026-03-15T08:30:00Z',
  },
  {
    id: '3',
    alertType: 'proximity',
    severity: 'MEDIUM',
    title: 'Vessels in close proximity',
    description:
      'Two flagged vessels within 200m — potential STS transfer',
    entityId: 'MMSI-111222333',
    status: 'ACKNOWLEDGED',
    createdAt: '2026-03-15T06:15:00Z',
  },
  {
    id: '4',
    alertType: 'pattern',
    severity: 'HIGH',
    title: 'Route deviation detected',
    description: 'Aircraft FORTE12 deviated 45nm from standard ISR orbit',
    entityId: 'ICAO-ae1234',
    status: 'ESCALATED',
    createdAt: '2026-03-14T22:00:00Z',
  },
  {
    id: '5',
    alertType: 'correlation',
    severity: 'MEDIUM',
    title: 'Correlated events detected',
    description:
      'Internet outage in Iran coincides with military vessel movements',
    status: 'DISMISSED',
    createdAt: '2026-03-14T18:00:00Z',
  },
];

export function AlertInbox() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const filtered =
    statusFilter === 'all'
      ? SAMPLE_ALERTS
      : SAMPLE_ALERTS.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" /> Alert Inbox{' '}
          <Badge variant="destructive" className="ml-1">
            {SAMPLE_ALERTS.filter((a) => a.status === 'NEW').length}
          </Badge>
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
