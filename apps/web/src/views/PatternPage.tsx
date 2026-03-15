import { PatternAnalyzer } from '@/components/patterns/PatternAnalyzer';
import { MovementHeatmap } from '@/components/patterns/MovementHeatmap';
import { BehaviorTimeline } from '@/components/patterns/BehaviorTimeline';
import { RouteComparison } from '@/components/patterns/RouteComparison';

export default function PatternPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PatternAnalyzer />
      <div className="grid grid-cols-2 gap-4">
        <MovementHeatmap />
        <BehaviorTimeline />
      </div>
      <RouteComparison />
    </div>
  );
}
