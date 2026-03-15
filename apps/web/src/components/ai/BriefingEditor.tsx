import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users } from 'lucide-react';

export function BriefingEditor() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Briefing Editor</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> 2 editors
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div
          className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] rounded-md border bg-background p-4 focus-within:ring-2 focus-within:ring-ring"
          contentEditable
          suppressContentEditableWarning
        >
          <h2>Intelligence Briefing</h2>
          <p>
            Edit this briefing collaboratively. In production, this uses
            BlockNote with Y-Sweet for real-time collaboration.
          </p>
          <h3>Executive Summary</h3>
          <p>
            Maritime activity in the Strait of Hormuz remains elevated compared
            to seasonal baselines...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
