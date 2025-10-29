import React from "react";
import { Building, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InternshipSearchResult } from "./types";
import { InternshipCard } from "@/components/InternshipCard";
import { supabase } from "@/integrations/supabase/client";

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
  
  const handleApply = async (internshipId: string, applicationLink: string) => {
    if (!applicationLink) return;

    // Call onApply callback if provided
    if (onApply) {
      onApply(internshipId, applicationLink);
    }

    // Log the application
    try {
      await supabase.functions.invoke('apply-log', {
        body: {
          internship_id: internshipId,
          application_url: applicationLink,
          user_agent: navigator.userAgent,
        }
      });
    } catch (error) {
      // Silent fail - logging is not critical
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
        <InternshipCard
          key={internship.id}
          internship={internship}
          onApply={handleApply}
          showApplicationToggle={true}
        />
      ))}
    </div>
  );
}