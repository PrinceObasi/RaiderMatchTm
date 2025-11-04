import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const POPULAR_TECHS = [
  { tag: 'python', label: 'Python' },
  { tag: 'javascript', label: 'JavaScript' },
  { tag: 'java', label: 'Java' },
  { tag: 'c++', label: 'C++' },
  { tag: 'c#', label: 'C#' },
  { tag: 'go', label: 'Go' },
  { tag: 'react', label: 'React' },
  { tag: 'node.js', label: 'Node.js' },
  { tag: 'typescript', label: 'TypeScript' },
  { tag: 'sql', label: 'SQL' },
  { tag: 'git', label: 'Git' },
  { tag: 'aws', label: 'AWS' },
  { tag: 'docker', label: 'Docker' },
  { tag: 'kubernetes', label: 'Kubernetes' },
  { tag: 'linux', label: 'Linux' },
  { tag: 'tensorflow', label: 'TensorFlow' },
  { tag: 'pytorch', label: 'PyTorch' },
];

interface TechStackMultiSelectProps {
  value: string[];
  onChange: (stacks: string[]) => void;
  name: string;
}

export function TechStackMultiSelect({ value, onChange, name }: TechStackMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const addTech = (tech: string) => {
    const trimmed = tech.trim();
    if (!trimmed) return;
    
    const normalized = trimmed.toLowerCase();
    const existing = value.map(v => v.toLowerCase());
    
    if (!existing.includes(normalized)) {
      const newStacks = [...value, trimmed];
      console.debug("TechStackMultiSelect add", { tech: trimmed, prev: value, next: newStacks });
      onChange(newStacks);
    }
    setInputValue("");
  };

  const removeTech = (tech: string) => {
    const newStacks = value.filter(t => t !== tech);
    console.debug("TechStackMultiSelect remove", { tech, prev: value, next: newStacks });
    onChange(newStacks);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTech(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Tech Stack</Label>
      
      {/* Selected badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tech) => (
            <Badge key={tech} variant="secondary" className="flex items-center gap-1">
              {tech}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTech(tech)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    removeTech(tech);
                  }
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start h-10 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            tabIndex={0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add tech stack...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start" style={{ zIndex: 9999 }}>
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Type to add technology..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                autoFocus
              />
            </div>
            
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Popular Technologies
              </Label>
              <div className="flex flex-wrap gap-1">
                {POPULAR_TECHS
                  .filter(tech => !value.map(v => v.toLowerCase()).includes(tech.tag.toLowerCase()))
                  .map((tech) => (
                    <Button
                      key={tech.tag}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addTech(tech.tag)}
                      className="h-6 text-xs hover:bg-primary hover:text-primary-foreground"
                      tabIndex={0}
                    >
                      {tech.label}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}