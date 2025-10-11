import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus } from "lucide-react";
import { WorkExperience } from "./ProfileTab";
import { WorkExperienceForm } from "./WorkExperienceForm";

interface WorkExperienceSectionProps {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
}

export function WorkExperienceSection({ experiences, onChange }: WorkExperienceSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newExperience: WorkExperience = {
      company: "",
      position: "",
      start_date: "",
      end_date: null,
      description: "",
      current: false
    };
    onChange([...experiences, newExperience]);
    setEditingIndex(experiences.length);
  };

  const handleUpdate = (index: number, experience: WorkExperience) => {
    const updated = [...experiences];
    updated[index] = experience;
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Work Experience
          </CardTitle>
          <Button onClick={handleAdd} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Experience
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {experiences.length === 0 ? (
          <p className="text-sm text-muted-foreground">No work experience added yet. Click "Add Experience" to get started.</p>
        ) : (
          experiences.map((exp, index) => (
            <WorkExperienceForm
              key={index}
              experience={exp}
              isEditing={editingIndex === index}
              onEdit={() => setEditingIndex(index)}
              onSave={(updated) => {
                handleUpdate(index, updated);
                setEditingIndex(null);
              }}
              onCancel={() => setEditingIndex(null)}
              onDelete={() => handleDelete(index)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
