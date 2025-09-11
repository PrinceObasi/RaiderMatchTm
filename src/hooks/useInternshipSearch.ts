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
      const { data, error } = await supabase.rpc('search_internships', params);
      
      if (error) {
        throw error;
      }
      
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
    enabled: enabled && Object.keys(filters).some(key => 
      key === 'q' ? !!filters.q : 
      Array.isArray(filters[key as keyof SearchFilters]) ? 
        (filters[key as keyof SearchFilters] as any[])?.length > 0 : 
        filters[key as keyof SearchFilters] !== 'any'
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}