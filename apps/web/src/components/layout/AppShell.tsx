import { ReactNode } from 'react';
import { NavRail } from './NavRail';
import { StatusBar } from './StatusBar';
import { ClassificationBanner } from './ClassificationBanner';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { useUiStore } from '@/stores/ui-store';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function AppShell({ children }: { children: ReactNode }) {
  const chatPanelOpen = useUiStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useUiStore((s) => s.setChatPanelOpen);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <ClassificationBanner />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <StatusBar />
      <Sheet open={chatPanelOpen} onOpenChange={setChatPanelOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[540px] p-0">
          <ChatPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
}
