import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, RefreshCw, ExternalLink } from "lucide-react";
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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-1">
              {internship.role_title || 'Software Engineering Intern'}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-muted-foreground font-medium">{internship.company}</p>
              {internship.final_domain && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {internship.final_domain}
                </Badge>
              )}
            </div>
          </div>
          {salaryBadge && (
            <Badge variant="secondary" className="ml-2 font-medium shrink-0">
              {salaryBadge}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {displayLocations.length > 0 && displayLocations[0] !== 'United States' && (
            <div className="flex items-center gap-1">
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
          
          {internship.date_posted && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Posted {formatDistanceToNow(new Date(internship.date_posted), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {(internship.summary_text || internship.jd_summary) && (
          <div className="text-sm text-foreground leading-relaxed">
            {(internship.summary_text || internship.jd_summary)?.slice(0, 160)}
            {(internship.summary_text || internship.jd_summary || '').length > 160 && '...'}
          </div>
        )}

        {(internship.core_requirements || internship.requirements) && 
         (internship.core_requirements || internship.requirements || []).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Requirements:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {(internship.core_requirements || internship.requirements)!.slice(0, 4).map((req, idx) => (
                <li key={idx} className="line-clamp-1">{req}</li>
              ))}
              {(internship.core_requirements || internship.requirements || []).length > 4 && (
                <li className="text-xs italic">
                  +{(internship.core_requirements || internship.requirements || []).length - 4} more requirements
                </li>
              )}
            </ul>
          </div>
        )}

        {internship.enriched_at && (
          <div className="text-xs text-muted-foreground">
            Enriched {formatDistanceToNow(new Date(internship.enriched_at), { addSuffix: true })}
          </div>
        )}

        {internship.tech_stack && internship.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {internship.tech_stack.slice(0, 6).map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {internship.tech_stack.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{internship.tech_stack.length - 6} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {internship.visa_sponsorship === 'Yes' && (
              <Badge variant="default">Visa Sponsorship</Badge>
            )}
            {internship.deadline && (
              <Badge variant="destructive">
                Deadline: {new Date(internship.deadline).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => {
                window.open(internship.direct_link || internship.application_link, '_blank');
                onApply(internship);
              }}
              className="gap-2"
            >
              Apply Directly
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}