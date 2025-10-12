import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const OPTIONS = [
  { key: 'finding_relevant_roles', label: 'Finding relevant roles' },
  { key: 'no_interviews_ats', label: 'No interviews / ATS rejections' },
  { key: 'resume_quality', label: 'Unsure if my résumé is strong' },
  { key: 'visa_sponsorship', label: 'Visa / sponsorship constraints' },
] as const;

interface OnboardingSurveyProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

export function OnboardingSurvey({ open, onComplete, userId }: OnboardingSurveyProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedChallenge) {
      toast({
        title: 'Selection required',
        description: 'Please select your biggest challenge',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({
          biggest_challenge: selectedChallenge,
          onboarding_completed: true,
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Thanks for sharing!',
        description: "We'll help you tackle this challenge.",
      });

      onComplete();
    } catch (error) {
      console.error('Survey submission error:', error);
      toast({
        title: 'Submission failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isSubmitting && onComplete()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to RaiderMatch! 🎯</DialogTitle>
          <DialogDescription>
            Help us personalize your experience. What's your biggest challenge when searching for internships?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="challenge">Select your biggest challenge</Label>
            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger id="challenge" className="bg-background">
                <SelectValue placeholder="Choose one..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedChallenge}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
