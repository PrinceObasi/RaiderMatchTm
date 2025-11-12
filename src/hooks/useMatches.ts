import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MatchedInternship {
  internship_id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  work_mode: string | null;
  summary_text: string | null;
  application_link: string;
  date_posted?: string;
  overlap_count: number;
  tech_overlap: string[];
  tech_stack: string[];
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  visa_sponsorship?: 'Yes' | 'No' | 'Unspecified';
}

export function useMatches(limit = 50) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  return useQuery({
    queryKey: ['matches', userId],
    queryFn: async (): Promise<MatchedInternship[]> => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Call the new tech_stack-based matching function
      const { data: matchData, error: matchError } = await supabase.rpc('match_internships_for_user_v2', {
        p_user_id: userId
      });

      if (matchError) {
        console.error('Error fetching matches:', matchError);
        throw matchError;
      }

      return matchData || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}