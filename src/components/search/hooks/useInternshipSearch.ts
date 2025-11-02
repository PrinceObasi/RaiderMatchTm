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
            application_link,
            created_at,
            summary_text,
            tech_stack,
            salary_min,
            salary_max
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

          // Helper to safely quote values that may include commas
          const esc = (s: string) => s.replace(/"/g, '\\"');
          
          if (otherLocations.length > 0) {
            // Build OR conditions for pattern matching each location (quote values to support commas)
            const locationConditions = otherLocations
              .map(loc => `location.ilike."%${esc(loc)}%"`)
              .join(',');
            
            if (hasRemote) {
              // Match either any of the locations OR remote postings
              query = query.or(`${locationConditions},remote_flag.eq.true,location.ilike."%Remote%"`);
            } else {
              query = query.or(locationConditions);
            }
          } else if (hasRemote) {
            query = query.or('remote_flag.eq.true,location.ilike."%Remote%"');
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

        // Exclude PhD roles
        query = query.not('role_title', 'ilike', '%phd%');

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