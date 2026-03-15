import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import GlobePage from './views/GlobePage';
import GraphPage from './views/GraphPage';
import TimelinePage from './views/TimelinePage';
import CasesPage from './views/CasesPage';
import AlertsPage from './views/AlertsPage';
import SearchPage from './views/SearchPage';
import EntityPage from './views/EntityPage';
import IngestionPage from './views/IngestionPage';
import PatternPage from './views/PatternPage';
import AdminPage from './views/AdminPage';

export default function App() {
  useKeyboardShortcuts();

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<GlobePage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/entities/:id" element={<EntityPage />} />
        <Route path="/ingestion" element={<IngestionPage />} />
        <Route path="/patterns" element={<PatternPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </AppShell>
  );
}
