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
  "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "C", "Go", "Rust", "Swift",
  "Kotlin", "PHP", "Ruby", "Scala", "R", "MATLAB", "Dart", "Perl", "Lua",
  
  // Frontend Technologies
  "React", "Vue.js", "Angular", "HTML", "CSS", "Sass", "Bootstrap", "Tailwind CSS",
  "jQuery", "Next.js", "Nuxt.js", "Svelte", "Flutter", "React Native",
  
  // Backend Technologies
  "Node.js", "Express.js", "Django", "Flask", "Spring Boot", "ASP.NET", "Laravel",
  "Rails", "FastAPI", "NestJS", "Gin", "Echo",
  
  // Databases
  "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Redis", "Firebase", "Supabase",
  "DynamoDB", "Cassandra", "Neo4j", "InfluxDB",
  
  // Cloud & DevOps
  "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Jenkins", "GitLab CI",
  "GitHub Actions", "Terraform", "Ansible", "Nginx", "Apache",
  
  // Data & Analytics
  "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Jupyter", "Tableau",
  "Power BI", "Apache Spark", "Elasticsearch", "Kibana",
  
  // Other Tools
  "Git", "Linux", "Ubuntu", "Postman", "Figma", "Jira", "Slack", "VS Code",
  "IntelliJ", "Eclipse", "Xcode", "Android Studio",
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
        <PopoverContent className="w-80 p-0 z-[100] pointer-events-auto bg-popover" align="start">
          <Command>
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
                      onClick={clearAll}
                      className="h-6 text-xs w-full"
                    >
                      Clear All ({value.length})
                    </Button>
                  </div>
                )}
                {filteredOptions.map((tech) => (
                  <CommandItem
                    key={tech}
                    onSelect={() => toggleTech(tech)}
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
