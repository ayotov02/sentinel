import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Hypothesis {
  id: string;
  text: string;
  status: 'neutral' | 'supported' | 'refuted';
}

export function HypothesisBoard() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([
    {
      id: '1',
      text: 'Vessels are conducting ship-to-ship transfers to evade sanctions monitoring',
      status: 'supported',
    },
    {
      id: '2',
      text: 'AIS gaps are caused by technical issues rather than intentional manipulation',
      status: 'refuted',
    },
    {
      id: '3',
      text: 'A third-party logistics company is coordinating the transfers',
      status: 'neutral',
    },
  ]);
  const [newText, setNewText] = useState('');

  const addHypothesis = () => {
    if (!newText.trim()) return;
    setHypotheses([
      ...hypotheses,
      { id: Date.now().toString(), text: newText, status: 'neutral' },
    ]);
    setNewText('');
  };

  const statusColors = {
    neutral: 'border-border',
    supported: 'border-green-500 bg-green-500/5',
    refuted: 'border-red-500 bg-red-500/5',
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Analysis of Competing Hypotheses
      </h3>
      {hypotheses.map((h) => (
        <Card key={h.id} className={`border-l-4 ${statusColors[h.status]}`}>
          <CardContent className="p-3 flex items-start justify-between">
            <p className="text-sm flex-1">{h.text}</p>
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setHypotheses(
                    hypotheses.map((x) =>
                      x.id === h.id ? { ...x, status: 'supported' } : x
                    )
                  )
                }
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setHypotheses(
                    hypotheses.map((x) =>
                      x.id === h.id ? { ...x, status: 'refuted' } : x
                    )
                  )
                }
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setHypotheses(hypotheses.filter((x) => x.id !== h.id))
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="New hypothesis..."
          className="flex-1 min-h-[40px]"
        />
        <Button size="icon" onClick={addHypothesis}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
