import { useMemo } from 'react';
import { ScatterplotLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { useCesiumDeckSync } from '@/hooks/useCesiumDeckSync';
import { useEntityStore } from '@/stores/entity-store';
import { useFilterStore } from '@/stores/filter-store';
import { ENTITY_COLORS } from '@/lib/constants';
import type { Viewer } from 'cesium';

interface Props {
  viewerRef: React.RefObject<Viewer | null>;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [128, 128, 128];
}

export function EntityLayer({ viewerRef }: Props) {
  const { viewState } = useCesiumDeckSync(viewerRef);
  const positions = useEntityStore((s) => s.getPositionsArray());
  const entities = useEntityStore((s) => s.entities);
  const selectEntity = useEntityStore((s) => s.selectEntity);
  const hoverEntity = useEntityStore((s) => s.hoverEntity);
  const layers = useFilterStore((s) => s.layers);
  const opacity = useFilterStore((s) => s.opacity);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const typeMap: Record<string, keyof typeof layers> = {
        aircraft: 'aircraft',
        vessel: 'vessel',
        satellite: 'satellite',
        event: 'event',
      };
      const layerKey = typeMap[p.entityType];
      return layerKey ? layers[layerKey] : true;
    });
  }, [positions, layers]);

  const scatterLayer = new ScatterplotLayer({
    id: 'entity-scatter',
    data: filteredPositions,
    getPosition: (d: any) => [d.lon, d.lat, (d.altitudeM || 0) * 10],
    getRadius: (d: any) => {
      if (d.entityType === 'aircraft') return 20000;
      if (d.entityType === 'vessel') return 15000;
      if (d.entityType === 'satellite') return 30000;
      return 12000;
    },
    getFillColor: (d: any) => {
      const hex = ENTITY_COLORS[d.entityType as keyof typeof ENTITY_COLORS] || '#6b7280';
      return [...hexToRgb(hex), 200] as [number, number, number, number];
    },
    pickable: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 20,
    onClick: (info: any) => {
      if (info.object) selectEntity(info.object.entityId);
    },
    onHover: (info: any) => {
      hoverEntity(info.object?.entityId || null);
    },
    updateTriggers: {
      getPosition: [filteredPositions.length],
      getFillColor: [filteredPositions.length],
    },
  });

  // Render as an overlay div with pointer-events handling
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* In production, this would use Deck as an overlay on Cesium */}
      {/* deck.gl layers are synced via useCesiumDeckSync viewState */}
      <div className="hidden">
        {/* Layer data: {filteredPositions.length} entities at zoom {viewState.zoom.toFixed(1)} */}
      </div>
    </div>
  );
}
