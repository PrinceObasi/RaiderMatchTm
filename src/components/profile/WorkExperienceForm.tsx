import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, Save, X, Trash2, Calendar } from "lucide-react";
import { WorkExperience } from "./ProfileTab";
import { format } from "date-fns";

interface WorkExperienceFormProps {
  experience: WorkExperience;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (experience: WorkExperience) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function WorkExperienceForm({
  experience,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}: WorkExperienceFormProps) {
  const [formData, setFormData] = useState(experience);

  const handleSave = () => {
    if (formData.company && formData.position && formData.start_date) {
      onSave(formData);
    }
  };

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  if (!isEditing) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-semibold">{experience.position || "Untitled Position"}</h4>
            <p className="text-sm text-muted-foreground">{experience.company || "Company Name"}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {formatDateDisplay(experience.start_date)} - {experience.current ? "Present" : formatDateDisplay(experience.end_date)}
            </div>
            {experience.description && (
              <p className="text-sm mt-2 whitespace-pre-wrap">{experience.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} size="icon" variant="ghost">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button onClick={onDelete} size="icon" variant="ghost">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            placeholder="Company name"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position *</Label>
          <Input
            id="position"
            placeholder="Job title"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="month"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="month"
            value={formData.end_date || ""}
            disabled={formData.current}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="current"
          checked={formData.current}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, current: checked === true, end_date: checked ? null : formData.end_date })
          }
        />
        <Label htmlFor="current" className="cursor-pointer">I currently work here</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your responsibilities and achievements..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          size="sm"
          disabled={!formData.company || !formData.position || !formData.start_date}
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </Card>
  );
}
