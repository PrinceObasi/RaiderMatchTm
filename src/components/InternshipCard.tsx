import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, MapPin, ExternalLink } from "lucide-react";
import { ApplicationToggle } from "@/components/ApplicationToggle";

interface InternshipCardProps {
  internship: {
    id: string;
    company: string;
    role_title?: string | null;
    title?: string;
    location?: string | null;
    city?: string;
    locations?: string[] | null;
    tech_stack?: string[] | null;
    skills?: string[];
    summary_text?: string | null;
    jd_summary?: string | null;
    description?: string;
    application_link?: string;
    direct_link?: string | null;
    visa_sponsorship?: 'Yes' | 'No' | 'Unspecified' | string;
  };
  onApply: (internshipId: string, applicationUrl: string) => void;
  showApplicationToggle?: boolean;
}

export function InternshipCard({ 
  internship, 
  onApply,
  showApplicationToggle = true 
}: InternshipCardProps) {
  
  // Normalize field names
  const title = internship.role_title || internship.title || 'Software Engineering Intern';
  const company = internship.company;
  const location = internship.location || internship.city || (internship.locations && internship.locations[0]);
  const techStack = internship.tech_stack || internship.skills || [];
  const description = internship.summary_text || internship.jd_summary || internship.description || '';
  const applyUrl = internship.direct_link || internship.application_link || '';
  
  // Clean description - remove "Apply now" text
  const cleanDescription = description
    .replace(/\b(Apply( now)?|Click here to apply)[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const handleApply = () => {
    if (applyUrl) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
      onApply(internship.id, applyUrl);
    }
  };

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header with title and Job insights */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-xl font-bold leading-tight flex-1">
            {title}
          </h3>
          <span className="text-sm text-muted-foreground shrink-0">
            Job insights
          </span>
        </div>

        {/* Company and Location */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            <span>{company}</span>
          </div>
          {location && location !== 'United States' && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Tech Stack */}
        {techStack && techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {techStack.slice(0, 12).map((tech) => (
              <Badge 
                key={tech} 
                variant="outline" 
                className="rounded-full border px-3 py-1 text-xs font-normal"
              >
                {tech}
              </Badge>
            ))}
            {techStack.length > 12 && (
              <Badge 
                variant="outline" 
                className="rounded-full border px-3 py-1 text-xs font-normal"
              >
                +{techStack.length - 12} more
              </Badge>
            )}
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          {cleanDescription ? (
            <p className="text-sm leading-relaxed line-clamp-4">
              {cleanDescription}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Description loading…
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleApply}
            disabled={!applyUrl}
            size="lg"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Apply Now
          </Button>
          {showApplicationToggle && (
            <ApplicationToggle internshipId={internship.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
