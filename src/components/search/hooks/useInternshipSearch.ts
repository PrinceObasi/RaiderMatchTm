import { useMemo } from 'react';
import { useAllInternships } from './useAllInternships';
import { NormalizedParams, InternshipSearchResult } from '../types';

export function useInternshipSearch(params: NormalizedParams | null, enabled = true) {
  const { data: all, isLoading, error, isFetching } = useAllInternships();

  const queryParams = params ?? {
    q: null,
    locations: null,
    visa: 'any' as const,
    stacks: null,
    limit_count: 20,
    offset_count: 0,
  };

  const filtered = useMemo(() => {
    if (!all || !enabled) return [];

    const q = queryParams.q?.trim().toLowerCase() || '';
    const locations = queryParams.locations || [];
    const visa = queryParams.visa;
    const stacks = queryParams.stacks || [];

    return all.filter((row) => {
      // 🔍 Text search filter
      if (q) {
        const haystack = [
          row.company || '',
          row.role_title || '',
          row.location || '',
          row.summary_text || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      // 📍 Location filter
      if (locations.length > 0) {
        const rowLoc = (row.location || '').toLowerCase();
        const matchesAnyLocation = locations.some((loc) => {
          const locLower = loc.trim().toLowerCase();
          return rowLoc.includes(locLower);
        });
        if (!matchesAnyLocation) {
          return false;
        }
      }

      // 🎓 Visa sponsorship filter
      if (visa !== 'any') {
        const expectedValue = visa === 'yes' ? 'Yes' : 'No';
        const rowVisa = (row as any).visa_sponsorship;
        if (rowVisa !== expectedValue) {
          return false;
        }
      }

      // 🧱 Tech stack filter
      if (stacks.length > 0) {
        const rowStacks = (row.tech_stack || []).map((s) => s.toLowerCase());
        const matchesAnyStack = stacks.some((stack) =>
          rowStacks.includes(stack.toLowerCase())
        );
        if (!matchesAnyStack) {
          return false;
        }
      }

      return true;
    });
  }, [all, enabled, queryParams.q, queryParams.locations, queryParams.visa, queryParams.stacks]);

  return {
    data: filtered,
    isLoading,
    error,
    isFetching,
  };
}