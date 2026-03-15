import {
  LayoutDashboard,
  Expand,
  Shrink,
  Route,
  Network,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TOOLBAR_ACTIONS = [
  { icon: LayoutDashboard, label: 'Dagre Layout' },
  { icon: Network, label: 'Force Layout' },
  { icon: Expand, label: 'Expand Selected' },
  { icon: Shrink, label: 'Collapse Selected' },
  { icon: Route, label: 'Shortest Path' },
  { icon: RefreshCw, label: 'Detect Communities' },
  { icon: Download, label: 'Export PNG' },
] as const;

export function GraphToolbar() {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-1 border-b bg-card px-3 py-1.5">
        <span className="text-sm font-medium mr-2">Link Analysis</span>
        <Separator orientation="vertical" className="h-5" />

        {TOOLBAR_ACTIONS.map(({ icon: Icon, label }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
