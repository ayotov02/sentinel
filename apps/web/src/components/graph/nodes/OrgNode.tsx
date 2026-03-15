import { Handle, Position, type NodeProps } from 'reactflow';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrgNode({ data, selected }: NodeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-2 bg-card px-3 py-2 shadow-md min-w-[120px]',
        selected
          ? 'border-red-400 ring-2 ring-red-400/30'
          : 'border-red-500/50',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-red-500 shrink-0" />
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
        className="!bg-red-500"
      />
    </div>
  );
}
