import { useUiStore } from '@/stores/ui-store';
import { CLASSIFICATION_COLORS } from '@/lib/constants';
import type { Classification } from '@sentinel/shared';

const LEVELS: Classification[] = [
  'UNCLASSIFIED',
  'CUI',
  'SECRET',
  'TOP_SECRET',
];

export function ClassificationBanner() {
  const classification = useUiStore((s) => s.classification);
  const setClassification = useUiStore((s) => s.setClassification);

  const bgColor = CLASSIFICATION_COLORS[classification] || '#22c55e';
  const displayText = classification.replace('_', ' ');

  const cycleClassification = () => {
    const idx = LEVELS.indexOf(classification);
    const next = LEVELS[(idx + 1) % LEVELS.length];
    setClassification(next);
  };

  return (
    <button
      onClick={cycleClassification}
      className="flex h-6 w-full items-center justify-center text-[11px] font-bold uppercase tracking-widest text-white transition-colors"
      style={{ backgroundColor: bgColor }}
    >
      {displayText}
    </button>
  );
}
