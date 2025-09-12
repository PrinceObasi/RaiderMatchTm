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
}

export function InternshipSearchContainer({ onApply, className }: InternshipSearchContainerProps) {
  const [params, setParams] = useState<NormalizedParams | null>(null);
  const [page, setPage] = useState(0);
  
  const limit = 20;
  const currentParams = params ? { ...params, offset_count: page * limit } : null;
  
  const { data: results = [], isLoading, isFetching, error } = useInternshipSearch(currentParams);

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
  }, []);

  const handleApplyToInternship = useCallback((internshipId: string, applicationUrl: string) => {
    if (onApply) {
      onApply(internshipId, applicationUrl);
    } else {
      window.open(applicationUrl, '_blank');
    }
  }, [onApply]);

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