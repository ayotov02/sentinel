import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ONLINE_USERS = [
  { id: '1', name: 'Jane Smith', color: '#3b82f6' },
  { id: '2', name: 'John Doe', color: '#10b981' },
];

export function PresenceAvatars() {
  return (
    <TooltipProvider>
      <div className="flex -space-x-2">
        {ONLINE_USERS.map((u) => (
          <Tooltip key={u.id}>
            <TooltipTrigger>
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarFallback
                  style={{ backgroundColor: u.color }}
                  className="text-white text-[10px]"
                >
                  {u.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{u.name}</TooltipContent>
          </Tooltip>
        ))}
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
          +1
        </div>
      </div>
    </TooltipProvider>
  );
}
