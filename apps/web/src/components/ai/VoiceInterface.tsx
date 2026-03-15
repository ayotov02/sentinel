import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function VoiceInterface() {
  const [listening, setListening] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={listening ? 'destructive' : 'outline'}
        size="icon"
        className={cn(
          'h-10 w-10 rounded-full',
          listening && 'animate-pulse',
        )}
        onClick={() => setListening(!listening)}
      >
        {listening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {listening && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Listening via Nova Sonic...
        </span>
      )}
    </div>
  );
}
