import React from "react";
import { Building, MapPin, Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InternshipSearchResult } from "./types";
import { toast } from "sonner";

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
  
  const handleApply = (internship: InternshipSearchResult) => {
    if (onApply && internship.application_link) {
      onApply(internship.id, internship.application_link);
    } else if (internship.application_link) {
      window.open(internship.application_link, '_blank');
    } else {
      toast.error('No application link available for this internship');
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
        <Card key={internship.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight break-words">
                  {internship.role_title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4 shrink-0" />
                    <span className="break-words">{internship.company}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{internship.location}</span>
                  </div>
                  {internship.date_posted && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{new Date(internship.date_posted).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Visa sponsorship badge */}
              {internship.visa_sponsorship && internship.visa_sponsorship !== 'Unspecified' && (
                <Badge variant={internship.visa_sponsorship === 'Yes' ? 'default' : 'secondary'}>
                  {internship.visa_sponsorship === 'Yes' ? 'Sponsors Visa' : 'No Visa'}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Tech stack */}
            {internship.tech_stack && internship.tech_stack.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {internship.tech_stack.map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Deadline warning */}
            {internship.deadline && (
              <div className="mb-4 text-sm text-muted-foreground">
                Application deadline: {new Date(internship.deadline).toLocaleDateString()}
              </div>
            )}

            {/* Apply button */}
            <div className="flex justify-end">
              <Button 
                onClick={() => handleApply(internship)}
                disabled={!internship.application_link}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}