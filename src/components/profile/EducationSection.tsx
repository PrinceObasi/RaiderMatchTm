import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";

interface EducationSectionProps {
  gpa: number | null;
  graduationYear: number | null;
  major: string | null;
  onChange: (field: string, value: any) => void;
}

export function EducationSection({ gpa, graduationYear, major, onChange }: EducationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="major">Major</Label>
            <Input
              id="major"
              placeholder="Computer Science"
              value={major || ""}
              onChange={(e) => onChange("major", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              type="number"
              step="0.01"
              min="0"
              max="4"
              placeholder="3.5"
              value={gpa || ""}
              onChange={(e) => onChange("gpa", e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="graduation_year">Graduation Year</Label>
            <Input
              id="graduation_year"
              type="number"
              placeholder="2025"
              value={graduationYear || ""}
              onChange={(e) => onChange("graduation_year", e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
