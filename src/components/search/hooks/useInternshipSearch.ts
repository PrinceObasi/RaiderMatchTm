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
      console.debug('Querying internships table with params:', queryParams);
      
      try {
        let query = supabase
          .from('internships')
          .select(`
            id,
            company,
            role_title,
            location,
            tech_stack,
            visa_sponsorship,
            application_link,
            direct_link,
            is_direct,
            link_type,
            final_domain,
            date_posted,
            deadline,
            jd_summary,
            summary_text,
            description_text,
            work_mode,
            core_requirements
          `);

        // Apply filters
        if (queryParams.q) {
          // Search in company, role_title, and tech_stack
          query = query.or(`company.ilike.%${queryParams.q}%,role_title.ilike.%${queryParams.q}%`);
        }

        if (queryParams.locations && queryParams.locations.length > 0) {
          // Handle remote separately
          const hasRemote = queryParams.locations.includes('Remote');
          const otherLocations = queryParams.locations.filter(loc => loc !== 'Remote');
          
          if (hasRemote && otherLocations.length > 0) {
            query = query.or(`location.in.(${otherLocations.join(',')}),remote_flag.eq.true`);
          } else if (hasRemote) {
            query = query.eq('remote_flag', true);
          } else {
            query = query.in('location', otherLocations);
          }
        }

        if (queryParams.visa !== 'any') {
          const visaValue = queryParams.visa === 'yes' ? 'Yes' : 'No';
          query = query.eq('visa_sponsorship', visaValue);
        }

        if (queryParams.stacks && queryParams.stacks.length > 0) {
          // Use overlap operator for arrays
          query = query.overlaps('tech_stack', queryParams.stacks);
        }

        // Apply pagination
        query = query
          .range(queryParams.offset_count, queryParams.offset_count + queryParams.limit_count - 1)
          .order('date_posted', { ascending: false, nullsFirst: false });

        const { data, error } = await query;
        
        if (error) {
          console.warn('Internships query failed:', error);
          throw error;
        }
        
        console.debug('Internships query returned:', { count: data?.length, data });
        
        return data ?? [];
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