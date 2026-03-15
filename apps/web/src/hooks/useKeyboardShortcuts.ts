import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores/ui-store';
import { useEntityStore } from '@/stores/entity-store';

const VIEW_PATHS = ['/', '/graph', '/timeline', '/cases', '/alerts', '/search', '/ingestion', '/admin'];

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const toggleChatPanel = useUiStore((s) => s.toggleChatPanel);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setLayerPanelOpen = useUiStore((s) => s.setLayerPanelOpen);
  const setChatPanelOpen = useUiStore((s) => s.setChatPanelOpen);
  const setDetailPanelOpen = useUiStore((s) => s.setDetailPanelOpen);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Ctrl+K / Cmd+K → open search
      if (meta && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
        return;
      }

      // Ctrl+/ → toggle chat panel
      if (meta && e.key === '/') {
        e.preventDefault();
        toggleChatPanel();
        return;
      }

      // Ctrl+1-8 → switch views
      if (meta && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < VIEW_PATHS.length) navigate(VIEW_PATHS[idx]);
        return;
      }

      // Escape → close panels / deselect
      if (e.key === 'Escape') {
        selectEntity(null);
        setChatPanelOpen(false);
        setDetailPanelOpen(false);
        return;
      }

      // Ctrl+Shift+D → toggle dark mode
      if (meta && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Ctrl+Shift+L → toggle layer panel
      if (meta && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setLayerPanelOpen(!(useUiStore.getState().layerPanelOpen));
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleChatPanel, toggleTheme, setLayerPanelOpen, setChatPanelOpen, setDetailPanelOpen, selectEntity]);
}
