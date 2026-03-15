import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      console.log(
        'Files dropped:',
        files.map((f) => f.name),
      );
    }
  }, []);

  return (
    <div className="space-y-3">
      <Card
        className={cn(
          'border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, TXT, CSV, Images — Max 50MB
        </p>
      </Card>

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or paste text content here for entity extraction..."
          className="min-h-[100px]"
        />
        {text && (
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setText('')}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
            <Button size="sm">
              <FileText className="h-3 w-3 mr-1" /> Extract Entities
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
