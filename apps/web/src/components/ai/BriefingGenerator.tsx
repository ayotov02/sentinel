import { useState } from 'react';
import { FileText, Sparkles, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BriefingSection {
  title: string;
  content: string;
  confidence: number;
}

interface Briefing {
  title: string;
  sections: BriefingSection[];
}

export function BriefingGenerator() {
  const [generating, setGenerating] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setBriefing({
        title: 'Intelligence Briefing — Strait of Hormuz',
        sections: [
          {
            title: 'Executive Summary',
            content:
              'Maritime activity in the Strait of Hormuz remains elevated. Analysis indicates 3 vessels of interest exhibiting anomalous behavior patterns consistent with sanctions evasion.',
            confidence: 0.85,
          },
          {
            title: 'Key Findings',
            content:
              '1. Vessel EVER SHADOW conducted 2 AIS gaps totaling 6 hours\n2. Ship-to-ship transfer suspected at 26.5\u00b0N, 56.2\u00b0E\n3. Iranian-flagged vessel deviated from declared route',
            confidence: 0.78,
          },
          {
            title: 'Recommendations',
            content:
              '1. Increase ISR coverage of the identified transfer point\n2. Flag EVER SHADOW for enhanced monitoring\n3. Coordinate with coalition maritime forces',
            confidence: 0.8,
          },
        ],
      });
      setGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Briefing Generator
        </h3>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          <Sparkles className="h-3 w-3 mr-1" />
          {generating ? 'Generating...' : 'Generate Briefing'}
        </Button>
      </div>

      {briefing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{briefing.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {briefing.sections.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold">{s.title}</h4>
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(s.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {s.content}
                </p>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3 mr-1" /> Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3 w-3 mr-1" /> Export DOCX
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
