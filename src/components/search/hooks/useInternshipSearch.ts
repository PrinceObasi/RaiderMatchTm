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
      console.debug('Querying active_internships with params:', queryParams);
      
      try {
        // ✅ Single base query from active_internships
        let query = supabase
          .from('active_internships')
          .select('*');

        // 🔍 Text search across multiple fields
        const searchTerm = queryParams.q?.trim();
        if (searchTerm && searchTerm.length > 0) {
          query = query.or(
            [
              `company.ilike.%${searchTerm}%`,
              `role_title.ilike.%${searchTerm}%`,
              `location.ilike.%${searchTerm}%`,
              `summary_text.ilike.%${searchTerm}%`,
            ].join(',')
          );
        }

        // 📍 Locations filter
        if (queryParams.locations && queryParams.locations.length > 0) {
          const locConds = queryParams.locations
            .filter(Boolean)
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

        // ⏱ Pagination and ordering
        query = query
          .order('date_posted', { ascending: false, nullsFirst: false })
          .range(queryParams.offset_count, queryParams.offset_count + queryParams.limit_count - 1);

        const { data, error } = await query;
        
        if (error) {
          console.warn('Active internships query failed:', error);
          throw error;
        }
        
        console.debug('Active internships query returned:', { count: data?.length });
        
        return (data ?? []) as unknown as InternshipSearchResult[];
      } catch (error) {
        console.warn('Internships search failed:', error);
        throw error;
      }
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData, // Updated from keepPreviousData
    enabled,
  });
}