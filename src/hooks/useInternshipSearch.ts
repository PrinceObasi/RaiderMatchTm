import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchFilters, normalizeSearchParams } from "@/lib/searchSchema";

interface UseInternshipSearchProps {
  filters: SearchFilters;
  userGpa?: number;
  enabled?: boolean;
}

export function useInternshipSearch({ filters, userGpa, enabled = true }: UseInternshipSearchProps) {
  const params = normalizeSearchParams(filters, userGpa);
  
  return useQuery({
    queryKey: ['internship-search', params],
    queryFn: async () => {
      console.log('Searching internships with params:', params);
      const { data, error } = await supabase.rpc('search_internships', params);
      
      if (error) {
        console.error('Search internships error:', error);
        throw error;
      }
      
      console.log('Search internships raw results:', data?.length || 0, 'items');
      
      // Map the results to match the expected interface
      return (data || []).map((item: any) => ({
        id: item.id,
        company: item.company,
        title: item.role_title || 'Software Engineering Intern',
        city: item.location || '',
        description: item.notes || '',
        skills: item.tech_stack || [],
        visa_sponsorship: item.visa_sponsorship || 'Unspecified',
        application_url: item.apply_url || item.application_link || ''
      }));
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}