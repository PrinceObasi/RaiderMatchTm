import React, { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const TECH_STACK_OPTIONS = [
  // Programming Languages
  "python", "java", "javascript", "typescript", "c++", "c#", "c", "go", "rust", "swift",
  "kotlin", "php", "ruby", "scala", "r", "matlab", "dart", "perl", "lua",
  
  // Frontend Technologies
  "react", "vue.js", "angular", "html", "css", "sass", "bootstrap", "tailwind css",
  "jquery", "next.js", "nuxt.js", "svelte", "flutter", "react native",
  
  // Backend Technologies
  "node.js", "express.js", "django", "flask", "spring boot", "asp.net", "laravel",
  "rails", "fastapi", "nestjs", "gin", "echo",
  
  // Databases
  "mysql", "postgresql", "mongodb", "sqlite", "redis", "firebase", "supabase",
  "dynamodb", "cassandra", "neo4j", "influxdb",
  
  // Cloud & DevOps
  "aws", "google cloud", "azure", "docker", "kubernetes", "jenkins", "gitlab ci",
  "github actions", "terraform", "ansible", "nginx", "apache",
  
  // Data & Analytics
  "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "jupyter", "tableau",
  "power bi", "apache spark", "elasticsearch", "kibana",
  
  // Other Tools
  "git", "linux", "ubuntu", "postman", "figma", "jira", "slack", "vs code",
  "intellij", "eclipse", "xcode", "android studio",
];

interface TechStackFilterProps {
  value: string[];
  onChange: (techStack: string[]) => void;
}

export function TechStackFilter({ value, onChange }: TechStackFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredOptions = TECH_STACK_OPTIONS.filter((tech) =>
    tech.toLowerCase().includes(searchValue.toLowerCase())
  );

  const toggleTech = (tech: string) => {
    const newTechStack = value.includes(tech)
      ? value.filter((t) => t !== tech)
      : [...value, tech];
    onChange(newTechStack);
  };

  const removeTech = (tech: string) => {
    onChange(value.filter((t) => t !== tech));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Tech Stack</Label>
      
      {/* Selected Technologies */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {value.map((tech) => (
            <Badge key={tech} variant="secondary" className="flex items-center gap-1 text-xs">
              {tech}
              <X
                className="h-3 w-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground rounded-sm"
                onClick={() => removeTech(tech)}
              />
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10"
          >
            {value.length === 0
              ? "Select technologies..."
              : `${value.length} selected`}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 z-[200] pointer-events-auto bg-popover border shadow-lg" 
          align="start"
          sideOffset={5}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Command className="border-0">
            <CommandInput
              placeholder="Search technologies..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-60">
              <CommandEmpty>No technologies found.</CommandEmpty>
              <CommandGroup>
                {value.length > 0 && (
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAll();
                      }}
                      className="h-6 text-xs w-full"
                    >
                      Clear All ({value.length})
                    </Button>
                  </div>
                )}
                {filteredOptions.map((tech) => (
                  <CommandItem
                    key={tech}
                    onSelect={(value) => {
                      console.log('Tech selected:', value);
                      toggleTech(tech);
                    }}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <span>{tech}</span>
                      {value.includes(tech) && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} {value.length === 1 ? "technology" : "technologies"} selected
        </p>
      )}
    </div>
  );
}
