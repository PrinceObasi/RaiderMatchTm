import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Download, ExternalLink } from "lucide-react";

interface Resume {
  id: string;
  student_name: string;
  company: string;
  position: string;
  major: string;
  graduation_year: number;
  resume_url: string;
  description: string | null;
}

interface ResumeCardProps {
  resume: Resume;
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const handleDownload = () => {
    window.open(resume.resume_url, '_blank');
  };

  const getCompanyColor = (company: string) => {
    switch (company.toLowerCase()) {
      case 'amazon':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'meta':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'microsoft':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{resume.student_name}</CardTitle>
          <Badge className={getCompanyColor(resume.company)}>
            {resume.company}
          </Badge>
        </div>
        <CardDescription className="text-sm font-medium">
          {resume.position}
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          {resume.major} • {resume.graduation_year}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {resume.description}
        </p>
        <Button 
          onClick={handleDownload}
          className="w-full"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Resume
        </Button>
      </CardContent>
    </Card>
  );
}