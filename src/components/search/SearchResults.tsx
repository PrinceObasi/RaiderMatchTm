import React from "react";
import { Building, MapPin, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  hasSearched: boolean;
}

export function SearchResults({ 
  results, 
  isLoading, 
  isFetching, 
  error, 
  onApply,
  resultCount,
  hasSearched 
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

  // Don't show anything if user hasn't searched yet
  if (!hasSearched) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground mb-4">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Search for internships</p>
            <p className="text-sm">
              Use the search form to find internship opportunities.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border hover:shadow-md transition-smooth">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-32" />
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
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {internship.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:text-right">
                <span className="text-sm text-muted-foreground">
                  {internship.visa_sponsorship && internship.visa_sponsorship !== 'Unspecified' && (
                    internship.visa_sponsorship === 'Yes' ? 'Sponsors Visa' : 'No Visa Sponsorship'
                  )}
                </span>
              </div>
            </div>
            
            {/* Description - simulate what a description might look like */}
            <p className="mt-2 text-sm sm:text-base text-muted-foreground line-clamp-3 sm:line-clamp-none mb-4">
              {internship.company} is seeking a talented {internship.role_title.toLowerCase()} to join their team in {internship.location}.
              {internship.tech_stack && internship.tech_stack.length > 0 && (
                <span> Experience with {internship.tech_stack.slice(0, 3).join(', ')} preferred.</span>
              )}
              {internship.deadline && (
                <span> Application deadline: {new Date(internship.deadline).toLocaleDateString()}.</span>
              )}
            </p>
            
            <div className="mt-4">
              <Button 
                onClick={() => handleApply(internship)}
                disabled={!internship.application_link}
                className="w-full sm:w-auto h-11"
                size="lg"
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