import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ApplicationDetailsModalProps {
  children: React.ReactNode;
  onSubmit: (details: { status?: string; note?: string; applied_at?: string }) => void;
}

export function ApplicationDetailsModal({ children, onSubmit }: ApplicationDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('applied');
  const [note, setNote] = useState('');
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSubmit({
      status,
      note: note.trim() || undefined,
      applied_at: new Date(appliedAt).toISOString(),
    });
    setIsOpen(false);
    // Reset form
    setStatus('applied');
    setNote('');
    setAppliedAt(new Date().toISOString().split('T')[0]);
  };

  const handleSkip = () => {
    onSubmit({});
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="applied_at">Applied Date</Label>
            <Input
              id="applied_at"
              type="date"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add any notes about this application..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}