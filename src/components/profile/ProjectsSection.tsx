import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderGit2, Plus } from "lucide-react";
import { Project } from "./ProfileTab";
import { ProjectForm } from "./ProjectForm";

interface ProjectsSectionProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

export function ProjectsSection({ projects, onChange }: ProjectsSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    const newProject: Project = {
      title: "",
      description: "",
      tech_stack: [],
      url: null,
      start_date: "",
      end_date: null
    };
    onChange([...projects, newProject]);
    setEditingIndex(projects.length);
  };

  const handleUpdate = (index: number, project: Project) => {
    const updated = [...projects];
    updated[index] = project;
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            Projects
          </CardTitle>
          <Button onClick={handleAdd} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects added yet. Click "Add Project" to showcase your work.</p>
        ) : (
          projects.map((project, index) => (
            <ProjectForm
              key={index}
              project={project}
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
