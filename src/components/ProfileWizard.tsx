import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjectDepth } from "@/lib/githubDepth";
import { isPhone } from "@/lib/validators";
import { StudentUpdateSchema } from "@/lib/schemas";

interface ProfileWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export function ProfileWizard({ isOpen, onClose, userId, onComplete }: ProfileWizardProps) {
  const [gpa, setGpa] = useState("");
  const [hasPrevIntern, setHasPrevIntern] = useState(false);
  const [github, setGithub] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const gpaValue = parseFloat(gpa);
      if (gpa && (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4)) {
        toast({
          title: "Invalid GPA",
          description: "Please enter a GPA between 0.0 and 4.0",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Validate phone number if provided
      if (phone && !isPhone(phone)) {
        toast({
          title: "Invalid phone number",
          description: "Please enter a valid US phone number",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Fetch project depth from GitHub
      const projectDepth = await fetchProjectDepth(github);

      // Validate update data with Zod
      const updateData = {
        gpa: gpa ? gpaValue : null,
        has_prev_intern: hasPrevIntern,
        github: github.trim() || null,
        project_depth: projectDepth,
        phone: phone.trim() || null,
        sms_opt_in: smsOptIn
      };

      // Validate data before updating
      StudentUpdateSchema.parse(updateData);

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: `GitHub projects analyzed. Project depth: ${Math.round(projectDepth * 100)}%`,
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
            <Label htmlFor="github">GitHub username (public)</Label>
            <Input
              id="github"
              placeholder="torvalds"
              value={github}
              onChange={(e) => setGithub(e.target.value.trim())}
            />
            <p className="text-xs text-muted-foreground">
              We'll analyze your public repositories to calculate project depth
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sms-consent"
              checked={smsOptIn}
              onCheckedChange={(checked) => setSmsOptIn(checked === true)}
            />
            <Label htmlFor="sms-consent" className="text-sm leading-relaxed">
              I agree to receive SMS about applications/interviews. Msg & data rates may apply.
            </Label>
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