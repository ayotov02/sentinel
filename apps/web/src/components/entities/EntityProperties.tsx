import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';

interface Props {
  properties: Record<string, any>;
}

function formatPropertyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">--</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'default' : 'secondary'} className="text-[10px]">
        {value ? 'Yes' : 'No'}
      </Badge>
    );
  }
  if (typeof value === 'object') {
    return (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
        {JSON.stringify(value)}
      </code>
    );
  }
  return <span className="text-sm">{String(value)}</span>;
}

export function EntityProperties({ properties }: Props) {
  const entries = Object.entries(properties || {});

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No properties available for this entity.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Entity Properties
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Property</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {formatPropertyKey(key)}
                </TableCell>
                <TableCell>{renderValue(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
