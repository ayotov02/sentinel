import { NavLink } from 'react-router-dom';
import {
  Globe,
  GitFork,
  Clock,
  Briefcase,
  Bell,
  Search,
  Upload,
  Settings,
  Moon,
  Sun,
  MessageCircle,
  Satellite,
} from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', icon: Globe, label: 'Command Center' },
  { path: '/graph', icon: GitFork, label: 'Link Analysis' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/cases', icon: Briefcase, label: 'Cases' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/ingestion', icon: Upload, label: 'Ingestion' },
  { path: '/admin', icon: Settings, label: 'Admin' },
] as const;

export function NavRail() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const toggleChatPanel = useUiStore((s) => s.toggleChatPanel);

  return (
    <TooltipProvider delayDuration={100}>
      <nav className="flex h-full w-16 flex-col items-center border-r bg-card py-2">
        {/* Logo */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Satellite className="h-5 w-5 text-primary" />
        </div>

        {/* Nav items */}
        <div className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleChatPanel}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">AI Assistant (Ctrl+/)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
