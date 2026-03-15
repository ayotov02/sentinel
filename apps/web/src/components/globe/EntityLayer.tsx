import { useMemo } from 'react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useCesiumDeckSync } from '@/hooks/useCesiumDeckSync';
import { useBufferVersion } from '@/hooks/useWebSocket';
import { entityBuffer } from '@/lib/entity-buffer';
import { useEntityStore } from '@/stores/entity-store';
import { useFilterStore } from '@/stores/filter-store';
import type { Viewer } from 'cesium';

interface Props {
  viewerRef: React.RefObject<Viewer | null>;
}

export function EntityLayer({ viewerRef }: Props) {
  const { viewState } = useCesiumDeckSync(viewerRef);
  const bufferVersion = useBufferVersion();
  const selectEntity = useEntityStore((s) => s.selectEntity);
  const hoverEntity = useEntityStore((s) => s.hoverEntity);

  // Get binary attribute data directly from the typed-array buffer
  // Zero-copy: returns subarray views into the same underlying ArrayBuffer
  const layerData = useMemo(() => {
    return entityBuffer.getLayerData();
  }, [bufferVersion]);

  const scatterLayer = new ScatterplotLayer({
    id: 'entity-scatter',
    data: layerData,
    getPosition: { value: layerData.attributes.getPosition.value, size: 2 },
    getFillColor: { value: layerData.attributes.getFillColor.value, size: 4 },
    getRadius: { value: layerData.attributes.getRadius.value, size: 1 },
    _dataDiff: () => [{ startRow: 0, endRow: layerData.length }],
    numInstances: layerData.length,
    pickable: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 20,
    onClick: (info: any) => {
      if (info.index >= 0) {
        const entityId = entityBuffer.getEntityIdAtIndex(info.index);
        if (entityId) selectEntity(entityId);
      }
    },
    onHover: (info: any) => {
      if (info.index >= 0) {
        const entityId = entityBuffer.getEntityIdAtIndex(info.index);
        hoverEntity(entityId || null);
      } else {
        hoverEntity(null);
      }
    },
    updateTriggers: {
      getPosition: [bufferVersion],
      getFillColor: [bufferVersion],
    },
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <div className="hidden">
        {/* Buffer: {layerData.length} entities, version {bufferVersion} */}
      </div>
    </div>
  );
}
