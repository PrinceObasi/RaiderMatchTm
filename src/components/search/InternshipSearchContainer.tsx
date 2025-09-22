import React, { useState, useCallback } from "react";
import { SearchForm } from "./SearchForm";
import { SearchResults } from "./SearchResults";
import { useInternshipSearch } from "./hooks/useInternshipSearch";
import { normalizeFilters } from "./utils/normalizeFilters";
import { FilterFormData, NormalizedParams } from "./types";
import { toast } from "sonner";

interface InternshipSearchContainerProps {
  onApply?: (internshipId: string, applicationUrl: string) => void;
  className?: string;
  showResultsInTab?: boolean;
  onSearchResults?: (results: any[], isLoading: boolean, hasSearched: boolean) => void;
}

export function InternshipSearchContainer({ onApply, className, showResultsInTab = false, onSearchResults }: InternshipSearchContainerProps) {
  const [params, setParams] = useState<NormalizedParams>({
    q: null,
    locations: null,
    visa: 'any',
    stacks: null,
    limit_count: 20,
    offset_count: 0,
  });
  const [page, setPage] = useState(0);
  const [hasFilters, setHasFilters] = useState(false);
  
  const limit = 20;
  const currentParams = { ...params, offset_count: page * limit };
  
  const { data: results = [], isLoading, isFetching, error } = useInternshipSearch(currentParams);

  // Pass results back to parent when showResultsInTab is true
  React.useEffect(() => {
    if (showResultsInTab && onSearchResults) {
      onSearchResults(results, isLoading || isFetching, true); // Always show results now
    }
  }, [results, isLoading, isFetching, showResultsInTab, onSearchResults]);

  // Show error toast when query fails
  React.useEffect(() => {
    if (error) {
      toast.error('Search failed. Please try again.');
    }
  }, [error]);

  const handleApply = useCallback((formData: FilterFormData) => {
    console.debug("Apply filters", formData);
    const normalized = normalizeFilters(formData, { limit_count: limit, offset_count: 0 });
    setParams(normalized);
    setPage(0); // Reset pagination on new search
    
    // Check if any filters are applied
    const hasActiveFilters = !!(
      normalized.q ||
      (normalized.locations && normalized.locations.length > 0) ||
      normalized.visa !== 'any' ||
      (normalized.stacks && normalized.stacks.length > 0)
    );
    setHasFilters(hasActiveFilters);
  }, []);

  const handleReset = useCallback(() => {
    console.debug("Reset filters");
    setParams({
      q: null,
      locations: null,
      visa: 'any',
      stacks: null,
      limit_count: limit,
      offset_count: 0,
    });
    setPage(0);
    setHasFilters(false);
  }, []);

  const handleApplyToInternship = useCallback((internshipId: string, applicationUrl: string) => {
    // 1️⃣ OPEN IMMEDIATELY (synchronous) - prevents popup blocking  
    const a = document.createElement('a');
    a.href = applicationUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2️⃣ Call onApply callback if provided for additional tracking
    if (onApply) {
      onApply(internshipId, applicationUrl);
    }

    // 3️⃣ BACKGROUND LOGGING (non-blocking)
    const logPayload = JSON.stringify({
      internship_id: internshipId,
      application_url: applicationUrl,
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
  }, [onApply]);

  // If showResultsInTab is true, only render the search form
  if (showResultsInTab) {
    return (
      <div className={className}>
        <SearchForm
          onApply={handleApply}
          onReset={handleReset}
          isLoading={isLoading || isFetching}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6">
        {/* Search Form */}
        <div className="space-y-4">
          <SearchForm
            onApply={handleApply}
            onReset={handleReset}
            isLoading={isLoading || isFetching}
          />
        </div>

        {/* Results */}
        <div>
          <SearchResults
            results={results}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            onApply={handleApplyToInternship}
            resultCount={results.length}
          />
          
          {/* Simple pagination - can be enhanced later */}
          {results.length === limit && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-accent"
              >
                Previous
              </button>
              <span className="px-4 py-2">Page {page + 1}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={results.length < limit || isLoading}
                className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-accent"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}