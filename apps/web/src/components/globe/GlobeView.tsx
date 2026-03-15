import { useEffect, useRef, useState } from 'react';
import { Viewer, Color, Cartesian3, Math as CesiumMath, UrlTemplateImageryProvider, ImageryLayer } from 'cesium';
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

  const [jammingZones, setJammingZones] = useState<any[]>([]);

  useEffect(() => {
    async function fetchJammingZones() {
      try {
        const res = await fetch('/api/osint/gps-jamming/active');
        if (res.ok) {
          const zones = await res.json();
          setJammingZones(zones);
        }
      } catch {}
    }
    fetchJammingZones();
    const interval = setInterval(fetchJammingZones, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      baseLayer: false,
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
      requestRenderMode: true,
      skyBox: false,
    });

    // Add CartoDB Dark Matter basemap (no Ion token needed)
    const cartoProvider = new UrlTemplateImageryProvider({
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      credit: 'Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
    });
    viewer.imageryLayers.addImageryProvider(cartoProvider);

    // Dark theme styling
    viewer.scene.backgroundColor = Color.fromCssColorString('#0a0a1a');
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0a0a1a');
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.skyAtmosphere.show = false;
    viewer.scene.sun.show = false;
    viewer.scene.moon.show = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.globe.enableLighting = false;

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

      {/* GPS Jamming Zones */}
      {jammingZones.length > 0 && (
        <div className="absolute top-16 left-4 z-10 space-y-1">
          {jammingZones.map((zone: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded bg-red-500/20 border border-red-500/40 px-2 py-1 text-[10px] text-red-300 backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              GPS Jamming: {zone.centerLat?.toFixed(1)},{zone.centerLon?.toFixed(1)} — {zone.severity} ({zone.affectedAircraft} aircraft)
            </div>
          ))}
        </div>
      )}

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
