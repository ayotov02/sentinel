import { useCallback, useRef, useState, useEffect } from 'react';
import type { Viewer } from 'cesium';

interface DeckViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

function heightToZoom(height: number): number {
  return Math.log2(40075016.686 / (height * Math.tan(Math.PI / 6))) - 1;
}

export function useCesiumDeckSync(viewerRef: React.RefObject<Viewer | null>) {
  const [viewState, setViewState] = useState<DeckViewState>({
    longitude: 35,
    latitude: 35,
    zoom: 3,
    pitch: 0,
    bearing: 0,
  });

  const rafRef = useRef<number>();

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const syncCamera = () => {
      const camera = viewer.camera;
      const carto = camera.positionCartographic;
      if (!carto) return;

      const longitude = (carto.longitude * 180) / Math.PI;
      const latitude = (carto.latitude * 180) / Math.PI;
      const zoom = Math.max(0, heightToZoom(carto.height));
      const pitch = (camera.pitch * 180) / Math.PI + 90;
      const bearing = (camera.heading * 180) / Math.PI;

      setViewState({ longitude, latitude, zoom, pitch, bearing });
    };

    const onChange = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(syncCamera);
    };

    viewer.camera.changed.addEventListener(onChange);
    viewer.camera.moveEnd.addEventListener(onChange);

    // Initial sync
    syncCamera();

    return () => {
      viewer.camera.changed.removeEventListener(onChange);
      viewer.camera.moveEnd.removeEventListener(onChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [viewerRef]);

  const onViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: DeckViewState }) => {
      setViewState(vs);
    },
    [],
  );

  return { viewState, onViewStateChange };
}
