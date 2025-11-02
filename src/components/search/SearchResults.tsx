import React from "react";
import { Building, AlertCircle, ExternalLink, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InternshipSearchResult } from "./types";
import { ApplicationToggle } from "@/components/ApplicationToggle";

interface SearchResultsProps {
  results: InternshipSearchResult[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onApply?: (internshipId: string, applicationUrl: string) => void;
  resultCount: number;
}

export function SearchResults({ 
  results, 
  isLoading, 
  isFetching, 
  error, 
  onApply,
  resultCount 
}: SearchResultsProps) {
  
  const handleApply = (internshipId: string, applicationLink: string) => {
    if (!applicationLink) {
      return;
    }

    // Open application link
    window.open(applicationLink, '_blank', 'noopener,noreferrer');

    // Call onApply callback if provided
    if (onApply) {
      onApply(internshipId, applicationLink);
    }

    // Log the application
    const logPayload = JSON.stringify({
      internship_id: internshipId,
      application_url: applicationLink,
      user_agent: navigator.userAgent,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([logPayload], { type: 'application/json' });
      navigator.sendBeacon('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', blob);
    } else {
      fetch('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: logPayload,
        keepalive: true,
      }).catch(() => {});
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Search failed. Please try again or contact support if the problem persists.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with result count and loading state */}
      <div className="flex items-center justify-between" aria-live="polite">
        <h2 className="text-xl font-semibold">
          {resultCount} Internship{resultCount !== 1 ? 's' : ''} Found
        </h2>
        {isFetching && (
          <div className="text-sm text-muted-foreground">Updating...</div>
        )}
      </div>

      {/* Empty State */}
      {results.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground mb-4">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No internships match your filters</p>
              <p className="text-sm">
                Try widening your search criteria or removing some filters.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.map((internship) => (
        <Card key={internship.id} className="border hover:shadow-md transition-smooth">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">
                  {internship.role_title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {internship.company}
                  </div>
                  {internship.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {internship.location}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {internship.summary_text ? (
                    <p className="text-sm whitespace-pre-line leading-6 line-clamp-4">
                      {internship.summary_text.replace(/\b(Apply( now)?|Click here to apply)[\s\S]*$/i, '').replace(/\s+/g, ' ').trim()}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Description loading…
                    </p>
                  )}
                </div>
                {(internship.salary_min || internship.salary_max) && (
                  <Badge variant="secondary" className="shrink-0 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-xs">
                      {internship.salary_min && internship.salary_max
                        ? `${Math.round(internship.salary_min / 1000)}k-${Math.round(internship.salary_max / 1000)}k`
                        : internship.salary_min
                        ? `${Math.round(internship.salary_min / 1000)}k+`
                        : `${Math.round(internship.salary_max / 1000)}k`}
                      {internship.salary_currency && internship.salary_currency !== 'USD' ? ` ${internship.salary_currency}` : ''}
                    </span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Tech Stack */}
            {Array.isArray(internship.tech_stack) && internship.tech_stack.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {internship.tech_stack.slice(0, 12).map((tech) => (
                  <span key={tech} className="rounded-full border px-2 py-0.5 text-xs">
                    {tech}
                  </span>
                ))}
                {internship.tech_stack.length > 12 && (
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    +{internship.tech_stack.length - 12} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => handleApply(internship.id, internship.application_link)}
                className="w-full sm:w-auto"
                disabled={!internship.application_link}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
              <ApplicationToggle internshipId={internship.id} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}