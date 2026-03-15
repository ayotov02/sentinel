import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ArrowUpRight, X, Clock } from 'lucide-react';
import { severityColor, formatTimestamp } from '@/lib/utils';

interface AlertData {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  entityId?: string;
  status: string;
  createdAt: string;
}

interface Props {
  alert: AlertData;
}

export function AlertCard({ alert }: Props) {
  const color = severityColor(alert.severity as any);
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-1">
          <h4 className="text-sm font-semibold">{alert.title}</h4>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: color, color }}
          >
            {alert.severity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {alert.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {alert.alertType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {alert.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(alert.createdAt)}
            </span>
          </div>
          {alert.status === 'NEW' && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Acknowledge"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Escalate"
              >
                <ArrowUpRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
