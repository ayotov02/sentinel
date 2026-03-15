import { useEffect, useRef, useState } from 'react';
import { Viewer, Ion, Color, Cartesian3, Math as CesiumMath, ImageryLayer, IonWorldImageryStyle } from 'cesium';
import 'cesium/Build/CesiumUnminified/Widgets/widgets.css';
import { EntityLayer } from './EntityLayer';
import { LayerPanel } from './LayerPanel';
import { EntityCard } from './EntityCard';
import { SearchBar } from './SearchBar';
import { TimelineScrubber } from './TimelineScrubber';
import { useEntityStore } from '@/stores/entity-store';
import { useUiStore } from '@/stores/ui-store';
import { useWebSocket } from '@/hooks/useWebSocket';

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const layerPanelOpen = useUiStore((s) => s.layerPanelOpen);
  const { connected } = useWebSocket();

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Set Cesium Ion token
    const token = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN;
    if (token) Ion.defaultAccessToken = token;

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      scene3DOnly: true,
      skyBox: false,
      skyAtmosphere: undefined,
      requestRenderMode: false,
    });

    // Dark theme styling
    viewer.scene.backgroundColor = Color.fromCssColorString('#0a0e1a');
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0f172a');
    viewer.scene.fog.enabled = true;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.showGroundAtmosphere = true;

    // Set initial camera position (Mediterranean)
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(35, 35, 8000000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    });

    viewerRef.current = viewer;
    setViewerReady(true);

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Cesium container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Overlay: deck.gl EntityLayer */}
      {viewerReady && <EntityLayer viewerRef={viewerRef} />}

      {/* Search bar overlay */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <SearchBar />
      </div>

      {/* Layer panel */}
      {layerPanelOpen && (
        <div className="absolute left-4 top-16 z-10">
          <LayerPanel />
        </div>
      )}

      {/* Entity card */}
      {selectedEntityId && (
        <div className="absolute right-4 top-16 z-10">
          <EntityCard entityId={selectedEntityId} />
        </div>
      )}

      {/* Timeline scrubber */}
      <div className="absolute bottom-8 left-16 right-4 z-10">
        <TimelineScrubber />
      </div>

      {/* Connection indicator */}
      <div className="absolute bottom-2 right-2 z-10">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
    </div>
  );
}
