import React, { useState, useCallback, useEffect, useMemo } from "react";
import { SearchForm } from "./SearchForm";
import { SearchResults } from "./SearchResults";
import { useInternshipSearch } from "./hooks/useInternshipSearch";
import { normalizeFilters } from "./utils/normalizeFilters";
import { FilterFormData, NormalizedParams } from "./types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface InternshipSearchContainerProps {
  onApply?: (internshipId: string, applicationUrl: string) => void;
  className?: string;
  showResultsInTab?: boolean;
  onSearchResults?: (results: any[], isLoading: boolean, hasSearched: boolean) => void;
  onRefresh?: () => void;
  refreshCount?: number;
}

export function InternshipSearchContainer({ onApply, className, showResultsInTab = false, onSearchResults, onRefresh, refreshCount = 0 }: InternshipSearchContainerProps) {
  const PAGE_SIZE = 10;
  
  const [params, setParams] = useState<NormalizedParams>({
    q: null,
    locations: null,
    visa: 'any',
    stacks: null,
    limit_count: 50,
    offset_count: 0,
  });
  const [hasFilters, setHasFilters] = useState(false);
  
  const { data: internships = [], isLoading, isFetching, error } = useInternshipSearch(params);
  
  // Shuffled results state
  const [shuffled, setShuffled] = useState<typeof internships>([]);
  const [startIndex, setStartIndex] = useState(0);
  
  // Shuffle whenever search results change
  useEffect(() => {
    if (!internships || internships.length === 0) {
      setShuffled([]);
      setStartIndex(0);
      return;
    }

    const arr = [...internships];

    // Fisher–Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    setShuffled(arr);
    setStartIndex(0);
  }, [internships]);
  
  // Compute visible results with wrap-around
  const visible = useMemo(() => {
    if (!shuffled || shuffled.length === 0) return [];

    const result = [];
    const n = shuffled.length;

    for (let i = 0; i < Math.min(PAGE_SIZE, n); i++) {
      result.push(shuffled[(startIndex + i) % n]);
    }

    return result;
  }, [shuffled, startIndex, PAGE_SIZE]);

  // Pass results back to parent when showResultsInTab is true
  React.useEffect(() => {
    if (showResultsInTab && onSearchResults) {
      onSearchResults(visible, isLoading || isFetching, true);
    }
  }, [visible, isLoading, isFetching, showResultsInTab, onSearchResults]);

  // Show error toast when query fails
  React.useEffect(() => {
    if (error) {
      toast.error('Search failed. Please try again.');
    }
  }, [error]);

  const handleApply = useCallback((formData: FilterFormData) => {
    console.debug("Apply filters", formData);
    const normalized = normalizeFilters(formData, { limit_count: 50, offset_count: 0 });
    setParams(normalized);
    
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
      limit_count: 50,
      offset_count: 0,
    });
    setHasFilters(false);
  }, []);
  
  const handleShowDifferent = useCallback(() => {
    if (!shuffled || shuffled.length === 0) return;

    setStartIndex((prev) => {
      const n = shuffled.length;
      if (n <= PAGE_SIZE) return 0; // nothing to rotate, everything is already visible
      return (prev + PAGE_SIZE) % n;
    });
  }, [shuffled, PAGE_SIZE]);

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
            results={visible}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            onApply={handleApplyToInternship}
            resultCount={shuffled.length}
          />
          
          {/* Show different results button */}
          {shuffled.length > PAGE_SIZE && (
            <div className="flex justify-center mt-6">
              <Button
                type="button"
                onClick={handleShowDifferent}
                disabled={isLoading}
                variant="outline"
                className="rounded-xl"
              >
                Show different results
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}