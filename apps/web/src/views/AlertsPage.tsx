import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertInbox } from '@/components/alerts/AlertInbox';
import { WatchlistManager } from '@/components/alerts/WatchlistManager';
import { AlertRuleBuilder } from '@/components/alerts/AlertRuleBuilder';

export default function AlertsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="rules">Watchlist Rules</TabsTrigger>
          <TabsTrigger value="create">Create Rule</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="mt-4"><AlertInbox /></TabsContent>
        <TabsContent value="rules" className="mt-4"><WatchlistManager /></TabsContent>
        <TabsContent value="create" className="mt-4"><AlertRuleBuilder /></TabsContent>
      </Tabs>
    </div>
  );
}
