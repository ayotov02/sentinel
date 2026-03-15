import { create } from 'zustand';

interface LayerVisibility {
  aircraft: boolean;
  vessel: boolean;
  satellite: boolean;
  event: boolean;
  fire: boolean;
  notam: boolean;
  outage: boolean;
}

interface LayerOpacity {
  aircraft: number;
  vessel: number;
  satellite: number;
  event: number;
  fire: number;
  notam: number;
  outage: number;
}

interface FilterState {
  layers: LayerVisibility;
  opacity: LayerOpacity;
  timeRange: { start: Date; end: Date };
  entityTypeFilter: string[];
  sourceFilter: string[];
  severityFilter: string[];
  searchQuery: string;

  toggleLayer: (layer: keyof LayerVisibility) => void;
  setLayerOpacity: (layer: keyof LayerOpacity, value: number) => void;
  setTimeRange: (start: Date, end: Date) => void;
  setEntityTypeFilter: (types: string[]) => void;
  setSourceFilter: (sources: string[]) => void;
  setSeverityFilter: (severities: string[]) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const defaultLayers: LayerVisibility = {
  aircraft: true,
  vessel: true,
  satellite: true,
  event: true,
  fire: true,
  notam: false,
  outage: false,
};

const defaultOpacity: LayerOpacity = {
  aircraft: 1,
  vessel: 1,
  satellite: 1,
  event: 1,
  fire: 0.8,
  notam: 0.7,
  outage: 0.6,
};

export const useFilterStore = create<FilterState>((set) => ({
  layers: { ...defaultLayers },
  opacity: { ...defaultOpacity },
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  entityTypeFilter: [],
  sourceFilter: [],
  severityFilter: [],
  searchQuery: '',

  toggleLayer: (layer) =>
    set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),
  setLayerOpacity: (layer, value) =>
    set((state) => ({ opacity: { ...state.opacity, [layer]: value } })),
  setTimeRange: (start, end) => set({ timeRange: { start, end } }),
  setEntityTypeFilter: (types) => set({ entityTypeFilter: types }),
  setSourceFilter: (sources) => set({ sourceFilter: sources }),
  setSeverityFilter: (severities) => set({ severityFilter: severities }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () =>
    set({
      layers: { ...defaultLayers },
      opacity: { ...defaultOpacity },
      entityTypeFilter: [],
      sourceFilter: [],
      severityFilter: [],
      searchQuery: '',
    }),
}));
