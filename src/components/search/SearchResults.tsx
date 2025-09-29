import React from "react";
import { Building, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InternshipSearchResult } from "./types";
import { ApplicationToggle } from "@/components/ApplicationToggle";
import { EnrichedInternshipCard } from "@/components/EnrichedInternshipCard";
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
    if (!internship.application_link) {
      return;
    }

    // Use direct_link if available, fallback to application_link
    const linkToUse = internship.direct_link || internship.application_link;

    // 1️⃣ OPEN IMMEDIATELY (synchronous) - prevents popup blocking
    const a = document.createElement('a');
    a.href = linkToUse;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2️⃣ Call onApply callback if provided for additional tracking
    if (onApply) {
      onApply(internship.id, linkToUse);
    }

    // 3️⃣ BACKGROUND LOGGING (non-blocking) 
    const logPayload = JSON.stringify({
      internship_id: internship.id,
      application_url: linkToUse,
      user_agent: navigator.userAgent,
    });

    // Use sendBeacon if available, fallback to fetch with keepalive
    if (navigator.sendBeacon) {
      const blob = new Blob([logPayload], { type: 'application/json' });
      navigator.sendBeacon('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', blob);
    } else {
      fetch('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: logPayload,
        keepalive: true,
      }).catch(() => {}); // Silently ignore errors
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
        <div key={internship.id} className="space-y-2">
          <EnrichedInternshipCard
            internship={internship}
            onApply={handleApply}
          />
          <div className="flex justify-end">
            <ApplicationToggle internshipId={internship.id} />
          </div>
        </div>
      ))}
    </div>
  );
}