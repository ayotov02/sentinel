import { useParams } from 'react-router-dom';
import { EntityProfile } from '@/components/entities/EntityProfile';

export default function EntityPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <EntityProfile
      entity={{
        id,
        entityId: id,
        displayName: id || 'Unknown',
        entityType: 'aircraft',
        source: 'opensky',
        confidence: 0.95,
        firstSeen: '2026-03-10T00:00:00Z',
        lastSeen: '2026-03-15T10:00:00Z',
        lat: 36.5,
        lon: 33.2,
        properties: {},
      }}
    />
  );
}
