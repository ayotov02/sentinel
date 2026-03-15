import { Play, Pause, SkipForward, Radio } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ANIMATION_SPEEDS } from '@/lib/constants';
import { useState, useMemo } from 'react';

export function TimelineScrubber() {
  const { currentTime, isLive, playbackSpeed, setCurrentTime, setIsLive, setPlaybackSpeed } = useUiStore();
  const [playing, setPlaying] = useState(false);

  const thirtyDaysAgo = useMemo(() => Date.now() - 30 * 24 * 60 * 60 * 1000, []);
  const now = Date.now();
  const timeValue = currentTime.getTime();

  const progress = ((timeValue - thirtyDaysAgo) / (now - thirtyDaysAgo)) * 100;

  const handleSliderChange = ([value]: number[]) => {
    const time = thirtyDaysAgo + (value / 100) * (now - thirtyDaysAgo);
    setCurrentTime(new Date(time));
    if (isLive) setIsLive(false);
  };

  const goLive = () => {
    setIsLive(true);
    setCurrentTime(new Date());
    setPlaying(false);
  };

  const cycleSpeed = () => {
    const idx = ANIMATION_SPEEDS.indexOf(playbackSpeed);
    const next = ANIMATION_SPEEDS[(idx + 1) % ANIMATION_SPEEDS.length];
    setPlaybackSpeed(next);
  };

  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return d.toISOString().substring(0, 16).replace('T', ' ') + 'Z';
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/95 backdrop-blur-sm px-4 py-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cycleSpeed}>
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
        <Badge variant="secondary" className="text-[10px] h-5">{playbackSpeed}x</Badge>
      </div>

      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(thirtyDaysAgo)}</span>

      <Slider
        value={[progress]}
        onValueChange={handleSliderChange}
        max={100}
        step={0.1}
        className="flex-1"
      />

      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDate(timeValue)}
      </span>

      <Button
        variant={isLive ? 'default' : 'outline'}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={goLive}
      >
        <Radio className="h-3 w-3" />
        LIVE
      </Button>
    </div>
  );
}
