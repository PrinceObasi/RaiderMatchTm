import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export function ProfileWizard({ isOpen, onClose, userId, onComplete }: ProfileWizardProps) {
  const [gpa, setGpa] = useState("");
  const [hasPrevIntern, setHasPrevIntern] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchProjectDepth = async (username: string): Promise<number> => {
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos`);
      if (!response.ok) return 0;
      
      const repos = await response.json();
      const totalStars = repos.reduce((sum: number, repo: any) => sum + (repo.stargazers_count || 0), 0);
      return Math.min(totalStars / 50, 1);
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      return 0;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const gpaValue = parseFloat(gpa);
      if (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4) {
        toast({
          title: "Invalid GPA",
          description: "Please enter a GPA between 0.0 and 4.0",
          variant: "destructive"
        });
        return;
      }

      const projectDepth = githubUsername ? await fetchProjectDepth(githubUsername) : 0;

      const { error } = await supabase
        .from('students')
        .update({
          gpa: gpaValue,
          has_prev_intern: hasPrevIntern,
          project_depth: projectDepth
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile features have been saved successfully!"
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="gpa">GPA (0.0 - 4.0)</Label>
            <Input
              id="gpa"
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              placeholder="3.50"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="prev-intern"
              checked={hasPrevIntern}
              onCheckedChange={setHasPrevIntern}
            />
            <Label htmlFor="prev-intern">I have previous internship experience</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="github">GitHub Username (optional)</Label>
            <Input
              id="github"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="your-username"
            />
            <p className="text-sm text-muted-foreground">
              We'll analyze your public repositories to assess project depth
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Skip for now
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}