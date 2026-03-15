import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities?: { type: string; value: string }[];
}

export function EntityConfirmation({
  open,
  onOpenChange,
  entities = [],
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Entity Extraction</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <p className="text-sm text-muted-foreground">
            {entities.length || 5} entities will be added to the knowledge graph
            and database.
          </p>
          <div className="rounded-md border p-3 bg-muted/50">
            <p className="text-xs font-mono">
              2 persons, 1 organization, 1 vessel, 1 location
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            <Check className="h-3 w-3 mr-1" /> Confirm & Ingest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
