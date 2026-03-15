import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EntityProperties } from './EntityProperties';
import { EntityTimeline } from './EntityTimeline';
import { EntityRelationships } from './EntityRelationships';
import { entityColor, formatTimestamp, formatCoordinate } from '@/lib/utils';
import { MapPin, Clock, Shield, Database } from 'lucide-react';

export function EntityProfile({ entity }: { entity?: any }) {
  const e = entity || {
    displayName: 'THY123',
    entityType: 'aircraft',
    entityId: 'ICAO-a00000',
    source: 'opensky',
    confidence: 0.95,
    firstSeen: '2026-03-10T00:00:00Z',
    lastSeen: '2026-03-15T10:00:00Z',
    lat: 36.5,
    lon: 33.2,
    properties: {
      icao24: 'a00000',
      callsign: 'THY123',
      originCountry: 'Turkey',
    },
  };
  const color = entityColor(e.entityType);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h1 className="text-xl font-bold">{e.displayName}</h1>
          <Badge variant="outline">{e.entityType}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {e.entityId}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {Math.round(e.confidence * 100)}% confidence
          </span>
          {e.lat && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatCoordinate(e.lat, e.lon)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            First seen: {formatTimestamp(e.firstSeen)}
          </span>
        </div>
      </div>
      <Tabs defaultValue="properties" className="flex-1">
        <TabsList className="mx-6 mt-3">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="p-6">
          <EntityProperties properties={e.properties} />
        </TabsContent>
        <TabsContent value="timeline" className="p-6">
          <EntityTimeline entityId={e.entityId} />
        </TabsContent>
        <TabsContent value="relationships" className="p-6">
          <EntityRelationships entityId={e.entityId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
