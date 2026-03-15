import { DropZone } from '@/components/ingestion/DropZone';
import { IngestionQueue } from '@/components/ingestion/IngestionQueue';
import { ExtractionReview } from '@/components/ingestion/ExtractionReview';

export default function IngestionPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Unstructured Data Ingestion</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <DropZone />
          <IngestionQueue />
        </div>
        <ExtractionReview />
      </div>
    </div>
  );
}
