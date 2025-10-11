import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Trash2, ExternalLink, Calendar, Plus } from "lucide-react";
import { Project } from "./ProfileTab";
import { format } from "date-fns";

interface ProjectFormProps {
  project: Project;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (project: Project) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ProjectForm({
  project,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete
}: ProjectFormProps) {
  const [formData, setFormData] = useState(project);
  const [newTech, setNewTech] = useState("");

  const handleSave = () => {
    if (formData.title && formData.description) {
      onSave(formData);
    }
  };

  const handleAddTech = () => {
    if (newTech.trim() && !formData.tech_stack.includes(newTech.trim())) {
      setFormData({
        ...formData,
        tech_stack: [...formData.tech_stack, newTech.trim()]
      });
      setNewTech("");
    }
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      tech_stack: formData.tech_stack.filter(t => t !== tech)
    });
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
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{project.title || "Untitled Project"}</h4>
              {project.url && (
                <a 
                  href={project.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {formatDateDisplay(project.start_date)} - {project.end_date ? formatDateDisplay(project.end_date) : "Present"}
            </div>
            {project.description && (
              <p className="text-sm mt-2 whitespace-pre-wrap">{project.description}</p>
            )}
            {project.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {project.tech_stack.map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
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
      <div className="space-y-2">
        <Label htmlFor="title">Project Title *</Label>
        <Input
          id="title"
          placeholder="Project name"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Project URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://github.com/username/project"
          value={formData.url || ""}
          onChange={(e) => setFormData({ ...formData, url: e.target.value || null })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_start_date">Start Date</Label>
          <Input
            id="project_start_date"
            type="month"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project_end_date">End Date</Label>
          <Input
            id="project_end_date"
            type="month"
            value={formData.end_date || ""}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the project, your role, and achievements..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Tech Stack</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add technology (e.g., React, Python)"
            value={newTech}
            onChange={(e) => setNewTech(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTech();
              }
            }}
          />
          <Button onClick={handleAddTech} size="icon" type="button">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tech_stack.map((tech) => (
              <Badge key={tech} variant="secondary" className="gap-1">
                {tech}
                <button
                  onClick={() => handleRemoveTech(tech)}
                  className="ml-1 hover:text-destructive"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          size="sm"
          disabled={!formData.title || !formData.description}
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </Card>
  );
}
