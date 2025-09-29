import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MatchedInternship {
  id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  tech_stack: string[] | null;
  visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
  application_link: string;
  direct_link: string | null;
  link_type: string | null;
  date_posted: string | null;
  deadline: string | null;
}

export function useMatches(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['matches', limit, offset],
    queryFn: async (): Promise<MatchedInternship[]> => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Call the matching RPC function
      const { data, error } = await supabase.rpc('match_internships_for_user', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      });

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