import { Handle, Position, type NodeProps } from 'reactflow';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PersonNode({ data, selected }: NodeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card px-3 py-2 shadow-md min-w-[120px]',
        selected
          ? 'border-amber-400 ring-2 ring-amber-400/30'
          : 'border-amber-500/50',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500"
      />
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-amber-500 shrink-0" />
        <div>
          <div className="text-xs font-semibold">{data.label}</div>
          {data.confidence != null && (
            <div className="text-[10px] text-muted-foreground">
              {Math.round(data.confidence * 100)}% confidence
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500"
      />
    </div>
  );
}
