import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, RefreshCw, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface EnrichedInternshipCardProps {
  internship: {
    id: string;
    company: string;
    role_title: string | null;
    location: string | null;
    tech_stack: string[] | null;
    visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
    application_link: string;
    date_posted: string | null;
    deadline: string | null;
    jd_summary?: string | null;
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
      const response = await supabase.functions.invoke('enrich-internship', {
        body: { id: internship.id }
      });

      if (!response.error) {
        toast({
          title: "Enrichment Complete",
          description: "Job description has been updated with detailed information.",
        });
        // Reload page to show updated data
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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-1">
              {internship.role_title || 'Software Engineering Intern'}
            </CardTitle>
            <p className="text-muted-foreground font-medium">{internship.company}</p>
          </div>
          {salaryBadge && (
            <Badge variant="secondary" className="ml-2 font-medium">
              {salaryBadge}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {internship.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{internship.location}</span>
            </div>
          )}
          
          {internship.date_posted && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Posted {formatDistanceToNow(new Date(internship.date_posted), { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {internship.jd_summary && (
          <div className="text-sm text-foreground leading-relaxed">
            {internship.jd_summary}
          </div>
        )}

        {internship.enriched_at && (
          <div className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(internship.enriched_at), { addSuffix: true })}
          </div>
        )}

        {internship.tech_stack && internship.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {internship.tech_stack.slice(0, 4).map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
            {internship.tech_stack.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{internship.tech_stack.length - 4} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {internship.visa_sponsorship === 'Yes' && (
              <Badge variant="default">Visa Sponsorship</Badge>
            )}
            {internship.deadline && (
              <Badge variant="destructive">
                Deadline: {new Date(internship.deadline).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            {showEnrichButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnrich}
                disabled={isEnriching}
              >
                {isEnriching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Enrich
              </Button>
            )}
            
            <Button
              onClick={() => onApply(internship)}
              className="gap-2"
            >
              Apply Now
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}