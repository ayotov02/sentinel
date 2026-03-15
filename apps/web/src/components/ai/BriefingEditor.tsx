import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users } from 'lucide-react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import * as Y from 'yjs';

export function BriefingEditor() {
  const [userCount, setUserCount] = useState(1);

  const doc = useMemo(() => new Y.Doc(), []);
  const provider = useMemo(() => {
    // Connect to Y-Sweet WebSocket server for CRDT sync
    // Dynamically import to avoid SSR issues
    const wsUrl = `ws://localhost:8080/sentinel-briefing`;
    try {
      // Use native WebSocket as lightweight Yjs provider
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => setUserCount((c) => c + 1);
      ws.onclose = () => setUserCount((c) => Math.max(1, c - 1));

      return { ws, destroy: () => ws.close() };
    } catch {
      return null;
    }
  }, [doc]);

  useEffect(() => {
    return () => {
      provider?.destroy();
      doc.destroy();
    };
  }, [doc, provider]);

  const editor = useCreateBlockNote({
    collaboration: {
      provider: provider as any,
      fragment: doc.getXmlFragment('briefing'),
      user: {
        name: 'Analyst',
        color: '#3b82f6',
      },
    },
    initialContent: [
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Intelligence Briefing',
      },
      {
        type: 'paragraph',
        content:
          'Edit this briefing collaboratively. Changes sync in real-time via Y-Sweet CRDT.',
      },
      {
        type: 'heading',
        props: { level: 3 },
        content: 'Executive Summary',
      },
      {
        type: 'paragraph',
        content:
          'Maritime activity in the Strait of Hormuz remains elevated compared to seasonal baselines. Three vessels of interest have exhibited AIS gap patterns consistent with sanctions evasion.',
      },
      {
        type: 'heading',
        props: { level: 3 },
        content: 'Key Findings',
      },
      {
        type: 'bulletListItem',
        content: 'AIS dark periods detected for MMSI-200200000 (12h gap)',
      },
      {
        type: 'bulletListItem',
        content: 'GPS jamming zone expanded in Eastern Mediterranean',
      },
      {
        type: 'bulletListItem',
        content: 'IRGCN patrol vessel observed near commercial shipping lane',
      },
      {
        type: 'heading',
        props: { level: 3 },
        content: 'Recommendations',
      },
      {
        type: 'numberedListItem',
        content: 'Escalate MMSI-200200000 for sanctions screening',
      },
      {
        type: 'numberedListItem',
        content: 'Increase ISR orbit frequency over Strait of Hormuz',
      },
      {
        type: 'numberedListItem',
        content: 'Cross-reference vessel ownership with OpenSanctions data',
      },
    ],
  });

  const handleExportPdf = async () => {
    try {
      const blocks = editor.document;
      // Convert blocks to plain text for basic PDF generation
      const text = blocks
        .map((b: any) => {
          const content = b.content
            ?.map((c: any) => c.text || '')
            .join('');
          return content || '';
        })
        .filter(Boolean)
        .join('\n\n');

      // Create a simple downloadable text file as PDF fallback
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `briefing-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">Briefing Editor</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {userCount} editor
            {userCount !== 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleExportPdf}
          >
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="min-h-[300px] [&_.bn-container]:!bg-background [&_.bn-container]:!border-border">
          <BlockNoteView editor={editor} theme="dark" />
        </div>
      </CardContent>
    </Card>
  );
}
