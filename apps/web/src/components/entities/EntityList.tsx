import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { entityColor, formatTimestamp, formatCoordinate } from '@/lib/utils';
import { Search, Database, Filter, ExternalLink } from 'lucide-react';

interface Entity {
  id: string;
  entityId: string;
  displayName: string;
  entityType: string;
  source: string;
  confidence: number;
  lastSeen: string;
  lat?: number;
  lon?: number;
  status: string;
}

const SAMPLE_ENTITIES: Entity[] = [
  { id: '1', entityId: 'MMSI-123456789', displayName: 'EVER SHADOW', entityType: 'vessel', source: 'ais', confidence: 0.97, lastSeen: '2026-03-15T10:30:00Z', lat: 26.52, lon: 56.18, status: 'active' },
  { id: '2', entityId: 'MMSI-987654321', displayName: 'PACIFIC VOYAGER', entityType: 'vessel', source: 'ais', confidence: 0.94, lastSeen: '2026-03-15T10:28:00Z', lat: 26.48, lon: 56.22, status: 'active' },
  { id: '3', entityId: 'ICAO-ae1234', displayName: 'FORTE12', entityType: 'aircraft', source: 'opensky', confidence: 0.99, lastSeen: '2026-03-15T10:15:00Z', lat: 33.50, lon: 44.40, status: 'active' },
  { id: '4', entityId: 'ICAO-a00000', displayName: 'THY123', entityType: 'aircraft', source: 'opensky', confidence: 0.95, lastSeen: '2026-03-15T10:00:00Z', lat: 36.50, lon: 33.20, status: 'active' },
  { id: '5', entityId: 'MMSI-111222333', displayName: 'DARK HORIZON', entityType: 'vessel', source: 'ais', confidence: 0.88, lastSeen: '2026-03-15T08:45:00Z', lat: 27.10, lon: 56.80, status: 'stale' },
  { id: '6', entityId: 'EVT-ACLED-78901', displayName: 'Bamako Protest 03/14', entityType: 'event', source: 'acled', confidence: 0.90, lastSeen: '2026-03-14T14:00:00Z', lat: 12.63, lon: -8.00, status: 'active' },
  { id: '7', entityId: 'FAC-IR-001', displayName: 'Bandar Abbas Port', entityType: 'facility', source: 'manual', confidence: 1.0, lastSeen: '2026-03-15T00:00:00Z', lat: 27.18, lon: 56.27, status: 'active' },
  { id: '8', entityId: 'MMSI-444555666', displayName: 'PHANTOM CARRIER', entityType: 'vessel', source: 'ais', confidence: 0.72, lastSeen: '2026-03-13T22:00:00Z', lat: 25.80, lon: 55.10, status: 'lost' },
];

interface Props {
  onSelectEntity?: (entityId: string) => void;
}

export function EntityList({ onSelectEntity }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEntities = useMemo(() => {
    return SAMPLE_ENTITIES.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.entityId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        typeFilter === 'all' || e.entityType === typeFilter;
      const matchesStatus =
        statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const entityTypes = [
    ...new Set(SAMPLE_ENTITIES.map((e) => e.entityType)),
  ];

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    stale: 'bg-yellow-500',
    lost: 'bg-red-500',
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" /> Entity Registry
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {filteredEntities.length} / {SAMPLE_ENTITIES.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="stale">Stale</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Entity ID</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Confidence</TableHead>
                <TableHead className="text-xs">Last Seen</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.map((entity) => {
                const color = entityColor(entity.entityType as any);
                return (
                  <TableRow
                    key={entity.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onSelectEntity?.(entity.entityId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`h-2 w-2 rounded-full ${statusColors[entity.status] || 'bg-gray-400'}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {entity.displayName}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {entity.entityId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: color, color }}
                      >
                        {entity.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entity.source}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {entity.lat != null
                        ? formatCoordinate(entity.lat, entity.lon!)
                        : '--'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          entity.confidence >= 0.9
                            ? 'text-green-500'
                            : entity.confidence >= 0.75
                              ? 'text-yellow-500'
                              : 'text-red-500'
                        }
                      >
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatTimestamp(entity.lastSeen)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntity?.(entity.entityId);
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEntities.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No entities match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
