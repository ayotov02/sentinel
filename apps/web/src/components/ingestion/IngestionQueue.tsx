import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '@/lib/utils';
import { FileText, Image, Globe, Upload } from 'lucide-react';

const SAMPLE_JOBS = [
  {
    id: '1',
    filename: 'intel_report_march15.pdf',
    fileType: 'pdf',
    status: 'CONFIRMED',
    entityCount: 8,
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: '2',
    filename: 'osint_article.txt',
    fileType: 'text',
    status: 'REVIEW',
    entityCount: 5,
    createdAt: '2026-03-15T09:00:00Z',
  },
  {
    id: '3',
    filename: 'satellite_imagery.png',
    fileType: 'image',
    status: 'PROCESSING',
    entityCount: 0,
    createdAt: '2026-03-15T10:00:00Z',
  },
  {
    id: '4',
    filename: null,
    fileType: 'url',
    status: 'PENDING',
    entityCount: 0,
    createdAt: '2026-03-15T10:30:00Z',
  },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-500',
  PROCESSING: 'bg-blue-500',
  REVIEW: 'bg-yellow-500',
  CONFIRMED: 'bg-green-500',
  FAILED: 'bg-red-500',
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> =
  {
    pdf: FileText,
    text: FileText,
    image: Image,
    url: Globe,
  };

export function IngestionQueue() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Upload className="h-4 w-4" /> Ingestion Queue
      </h3>
      {SAMPLE_JOBS.map((job) => {
        const Icon = TYPE_ICONS[job.fileType] || FileText;
        return (
          <Card
            key={job.id}
            className="cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {job.filename || 'URL import'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatTimestamp(job.createdAt)} · {job.entityCount} entities
                </div>
              </div>
              <Badge
                className={`text-[10px] text-white ${STATUS_COLORS[job.status]}`}
              >
                {job.status}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
