import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Building, MapPin, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface EnrichedInternshipCardProps {
  internship: {
    id: string;
    company: string;
    role_title: string | null;
    location: string | null;
    locations?: string[] | null;
    work_mode?: string | null;
    tech_stack: string[] | null;
    visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
    application_link: string;
    direct_link?: string | null;
    is_direct?: boolean | null;
    final_domain?: string | null;
    date_posted: string | null;
    deadline: string | null;
    jd_summary?: string | null;
    summary_text?: string | null;
    core_requirements?: string[] | null;
    description_html?: string | null;
    requirements?: string[] | null;
    responsibilities?: string[] | null;
    salary_min?: number | null;
    salary_max?: number | null;
    salary_period?: string | null;
    enriched_at?: string | null;
  };
  onApply: (internship: any) => void;
  showEnrichButton?: boolean;
}

export function EnrichedInternshipCard({ internship, onApply, showEnrichButton = false }: EnrichedInternshipCardProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const { toast } = useToast();
  const displayDescription = internship.summary_text ?? internship.jd_summary ?? '';

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const response = await supabase.functions.invoke('enrich-from-simplify', {
        body: { 
          direct_link: internship.direct_link || internship.application_link,
          internship_id: internship.id 
        }
      });

      if (!response.error) {
        toast({
          title: "Enrichment Complete",
          description: "Job details loaded successfully.",
        });
        window.location.reload();
      } else {
        toast({
          title: "Enrichment Failed",
          description: response.error?.message || "Failed to enrich job posting",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enrich job posting",
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const formatSalary = (min?: number | null, max?: number | null, period?: string | null) => {
    if (!min && !max) return null;
    
    const formatAmount = (amount: number, period: string) => {
      if (period === 'hour') {
        return `$${amount}/hr`;
      } else if (period === 'year') {
        return amount >= 1000 ? `$${Math.round(amount / 1000)}k/yr` : `$${amount}/yr`;
      }
      return `$${amount}`;
    };

    if (min && max && min !== max) {
      return `${formatAmount(min, period || 'year')} - ${formatAmount(max, period || 'year')}`;
    }
    return formatAmount(min || max || 0, period || 'year');
  };

  const salaryBadge = formatSalary(internship.salary_min, internship.salary_max, internship.salary_period);
  
  const displayLocations = internship.locations && internship.locations.length > 0 
    ? internship.locations 
    : (internship.location ? [internship.location] : []);

  // Extract clean role title by removing long descriptions
  const cleanRoleTitle = (title: string | null) => {
    if (!title) return 'Software Engineering Intern';
    // If title is too long (likely contains full description), extract just the job title part
    if (title.length > 80) {
      // Try to extract title before " at " or " - " or take first 60 chars
      const atIndex = title.indexOf(' at ');
      if (atIndex > 0 && atIndex < 80) {
        return title.substring(0, atIndex).trim();
      }
      return title.substring(0, 60).trim() + '...';
    }
    return title;
  };

  // Clean description
  const cleanDescription = displayDescription
    .replace(/\b(Apply( now)?|Click here to apply)[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const handleApply = () => {
    const applyUrl = internship.direct_link || internship.application_link;
    if (applyUrl) {
      window.open(applyUrl, '_blank');
      onApply(internship);
    }
  };

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header with title and Job insights */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold leading-tight">
              {cleanRoleTitle(internship.role_title)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {salaryBadge && (
              <Badge variant="secondary" className="font-medium">
                {salaryBadge}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">Job insights</span>
          </div>
        </div>

        {/* Company and Location */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            <span>{internship.company}</span>
          </div>
          {displayLocations.length > 0 && displayLocations[0] !== 'United States' && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>
                {displayLocations[0]}
                {displayLocations.length > 1 && (
                  <span className="text-xs ml-1">+{displayLocations.length - 1} more</span>
                )}
              </span>
            </div>
          )}
          {internship.work_mode && (
            <Badge variant="outline" className="text-xs">
              {internship.work_mode}
            </Badge>
          )}
          {internship.final_domain && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {internship.final_domain}
            </Badge>
          )}
        </div>

        {/* Tech Stack */}
        {internship.tech_stack && internship.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {internship.tech_stack.slice(0, 12).map((tech) => (
              <Badge 
                key={tech} 
                variant="outline" 
                className="rounded-full border px-3 py-1 text-xs font-normal"
              >
                {tech}
              </Badge>
            ))}
            {internship.tech_stack.length > 12 && (
              <Badge 
                variant="outline" 
                className="rounded-full border px-3 py-1 text-xs font-normal"
              >
                +{internship.tech_stack.length - 12} more
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
            <p className="text-sm italic text-muted-foreground">Description loading…</p>
          )}
        </div>

        {/* Additional metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {internship.visa_sponsorship === 'Yes' && (
            <Badge variant="default">Visa Sponsorship</Badge>
          )}
          {internship.deadline && (
            <Badge variant="destructive">
              Deadline: {new Date(internship.deadline).toLocaleDateString()}
            </Badge>
          )}
          {internship.date_posted && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Posted {formatDistanceToNow(new Date(internship.date_posted), { addSuffix: true })}</span>
            </div>
          )}
        </div>
          
        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleApply}
            size="lg"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Apply Now
          </Button>
          {showEnrichButton && (
            <Button
              onClick={handleEnrich}
              variant="outline"
              disabled={isEnriching}
              className="gap-2"
            >
              {isEnriching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Enrich
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}