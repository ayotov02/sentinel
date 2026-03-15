import { useQuery } from '@tanstack/react-query';
import { getEntities, getEntity, getLatestPositions, getTrajectory, searchEntities } from '@/lib/api';
import { useState, useEffect } from 'react';

export function useEntities(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['entities', filters],
    queryFn: () => getEntities(filters),
  });
}

export function useEntity(id: string) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: () => getEntity(id),
    enabled: !!id,
  });
}

export function useLatestPositions(entityType?: string) {
  return useQuery({
    queryKey: ['latestPositions', entityType],
    queryFn: () => getLatestPositions(entityType),
    refetchInterval: 10_000,
  });
}

export function useTrajectory(entityId: string, start: string, end: string) {
  return useQuery({
    queryKey: ['trajectory', entityId, start, end],
    queryFn: () => getTrajectory(entityId, start, end),
    enabled: !!entityId && !!start && !!end,
  });
}

export function useSearchEntities(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['searchEntities', debouncedQuery],
    queryFn: () => searchEntities(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
}
