import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaseCreateModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('UNCLASSIFIED');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Operation name..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Case description..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Classification</label>
            <Select value={classification} onValueChange={setClassification}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
                <SelectItem value="CUI">CUI</SelectItem>
                <SelectItem value="SECRET">SECRET</SelectItem>
                <SelectItem value="TOP_SECRET">TOP SECRET</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
