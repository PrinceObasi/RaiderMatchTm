import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MatchedInternship {
  id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  work_mode: string | null;
  summary_text: string | null;
  description_text: string | null;
  tech_stack: string[] | null;
  match_count: number;
  matched_tags: string[] | null;
  application_link: string;
  direct_link: string;
  link_type: string;
  date_posted: string;
  deadline: string;
  visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
}

export function useMatches(limit = 50) {
  return useQuery({
    queryKey: ['matches', limit],
    queryFn: async (): Promise<MatchedInternship[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call the intelligent matching function
      const { data, error } = await supabase.rpc('match_internships_for_user', {
        p_user_id: user.id,
        p_limit: limit
      });

      if (error) {
        console.error('Error fetching matches:', error);
        throw error;
      }

      // Ensure match_count and matched_tags are present
      return (data || []).map((item: any) => ({
        ...item,
        match_count: item.match_count ?? 0,
        matched_tags: item.matched_tags ?? []
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}