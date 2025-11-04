import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NormalizedParams, InternshipSearchResult } from '../types';

export function useInternshipSearch(params: NormalizedParams | null, enabled = true) {
  const queryParams = params ?? {
    q: null,
    locations: null,
    visa: 'any' as const,
    stacks: null,
    limit_count: 20,
    offset_count: 0,
  };

  return useQuery({
    queryKey: ['internships/search', queryParams],
    queryFn: async (): Promise<InternshipSearchResult[]> => {
      // ✅ Single base query from active_internships
      let query = supabase.from('active_internships').select('*');

      // 🔍 Text search across multiple fields
      const q = queryParams.q?.trim();
      if (q && q.length > 0) {
        query = query.or(
          [
            `company.ilike.%${q}%`,
            `role_title.ilike.%${q}%`,
            `location.ilike.%${q}%`,
            `summary_text.ilike.%${q}%`,
          ].join(',')
        );
      }

      // 📍 Location filter
      if (queryParams.locations && queryParams.locations.length > 0) {
        const locConds = queryParams.locations
          .filter((loc) => loc && loc.trim().length > 0)
          .map((loc) => `location.ilike.%${loc.trim()}%`)
          .join(',');
        if (locConds.length > 0) {
          query = query.or(locConds);
        }
      }

      // 🎓 Visa sponsorship filter
      if (queryParams.visa !== 'any') {
        const visaValue = queryParams.visa === 'yes' ? 'Yes' : 'No';
        query = query.eq('visa_sponsorship', visaValue);
      }

      // 🧱 Tech stack filter
      if (queryParams.stacks && queryParams.stacks.length > 0) {
        query = query.overlaps('tech_stack', queryParams.stacks);
      }

      // ⏱ Ordering and pagination
      query = query
        .order('date_posted', { ascending: false, nullsFirst: false })
        .range(queryParams.offset_count, queryParams.offset_count + queryParams.limit_count - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Search query failed:', error);
        throw error;
      }

      return (data ?? []) as unknown as InternshipSearchResult[];
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}