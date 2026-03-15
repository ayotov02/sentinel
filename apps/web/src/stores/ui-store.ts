import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type View = 'globe' | 'graph' | 'timeline' | 'cases' | 'alerts' | 'search' | 'entity' | 'ingestion' | 'patterns' | 'admin';
type Theme = 'dark' | 'light';
type Classification = 'UNCLASSIFIED' | 'CUI' | 'SECRET' | 'TOP_SECRET';

interface UiState {
  activeView: View;
  theme: Theme;
  classification: Classification;
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  layerPanelOpen: boolean;
  detailPanelOpen: boolean;
  currentTime: Date;
  isLive: boolean;
  playbackSpeed: number;

  setActiveView: (view: View) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setClassification: (c: Classification) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setChatPanelOpen: (open: boolean) => void;
  toggleChatPanel: () => void;
  setLayerPanelOpen: (open: boolean) => void;
  setDetailPanelOpen: (open: boolean) => void;
  setCurrentTime: (time: Date) => void;
  setIsLive: (live: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeView: 'globe',
      theme: 'dark',
      classification: 'UNCLASSIFIED',
      sidebarOpen: true,
      chatPanelOpen: false,
      layerPanelOpen: true,
      detailPanelOpen: false,
      currentTime: new Date(),
      isLive: true,
      playbackSpeed: 1,

      setActiveView: (view) => set({ activeView: view }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next as Theme };
        }),
      setClassification: (classification) => set({ classification }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setChatPanelOpen: (chatPanelOpen) => set({ chatPanelOpen }),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setLayerPanelOpen: (layerPanelOpen) => set({ layerPanelOpen }),
      setDetailPanelOpen: (detailPanelOpen) => set({ detailPanelOpen }),
      setCurrentTime: (currentTime) => set({ currentTime }),
      setIsLive: (isLive) => set({ isLive }),
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    }),
    {
      name: 'sentinel-ui',
      partialize: (state) => ({
        theme: state.theme,
        classification: state.classification,
      }),
    },
  ),
);
