import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MatchedInternship {
  id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  application_link: string;
  created_at: string | null;
  summary_text: string | null;
  tech_stack: string[] | null;
}

export function useMatches(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['matches', limit, offset],
    queryFn: async (): Promise<MatchedInternship[]> => {
      const { data, error } = await supabase
        .from('internships')
        .select(`
          id,
          company,
          role_title,
          location,
          application_link,
          created_at,
          summary_text,
          tech_stack
        `)
        .eq('is_texas', true)
        .not('role_title', 'ilike', '%phd%')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching matches:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}