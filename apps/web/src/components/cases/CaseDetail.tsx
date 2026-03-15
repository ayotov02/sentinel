import { ArrowLeft, Users, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HypothesisBoard } from './HypothesisBoard';
import { ActivityFeed } from './ActivityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  caseId: string;
  onBack: () => void;
}

export function CaseDetail({ caseId, onBack }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold">Operation NEPTUNE WATCH</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px]">
              OPEN
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              UNCLASSIFIED
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> 3 members
            </span>
          </div>
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Entity
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <FileText className="h-3 w-3 mr-1" /> Generate Briefing
          </Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Entities (12)</TabsTrigger>
          <TabsTrigger value="hypotheses">Hypotheses</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="flex-1 p-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitoring suspicious vessel movements in the Strait of Hormuz.
                Multiple vessels have exhibited AIS manipulation patterns
                consistent with sanctions evasion.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="entities" className="flex-1 p-4 overflow-auto">
          <div className="text-sm text-muted-foreground">
            12 entities linked to this case
          </div>
        </TabsContent>
        <TabsContent value="hypotheses" className="flex-1 p-4 overflow-auto">
          <HypothesisBoard />
        </TabsContent>
        <TabsContent value="activity" className="flex-1 p-4 overflow-auto">
          <ActivityFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
