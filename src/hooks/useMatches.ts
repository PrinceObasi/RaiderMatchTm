import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MatchedInternship {
  id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  work_mode: string | null;
  summary_text: string | null;
  description_text?: string | null;
  tech_stack: string[] | null;
  match_count: number;
  matched_tags: string[] | null;
  application_link: string;
  direct_link?: string;
  link_type?: string;
  date_posted?: string;
  deadline?: string;
  visa_sponsorship?: 'Yes' | 'No' | 'Unspecified';
  // Allow any other fields from internships table
  [key: string]: any;
}

export function useMatches(limit = 50) {
  return useQuery({
    queryKey: ['matches', limit],
    queryFn: async (): Promise<MatchedInternship[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call the intelligent matching function to get matched internship IDs
      const { data: matchData, error: matchError } = await supabase.rpc('match_internships_for_user', {
        p_user_id: user.id,
        p_limit: limit
      });

      if (matchError) {
        console.error('Error fetching matches:', matchError);
        throw matchError;
      }

      if (!matchData || matchData.length === 0) {
        return [];
      }

      // Get full internship details for matched IDs
      const internshipIds = matchData.map((m: any) => m.id);
      const { data: internships, error: internshipsError } = await supabase
        .from('internships')
        .select('*')
        .in('id', internshipIds);

      if (internshipsError) {
        console.error('Error fetching internship details:', internshipsError);
        throw internshipsError;
      }

      // Merge match data with full internship details
      return (matchData || []).map((match: any) => {
        const internship = internships?.find((i) => i.id === match.id);
        return {
          ...internship,
          match_count: match.match_count ?? 0,
          matched_tags: match.matched_tags ?? [],
          // Keep the matched fields from RPC
          role_title: match.role_title || internship?.role_title,
          company: match.company || internship?.company,
          location: match.location || internship?.location,
          work_mode: match.work_mode || internship?.work_mode,
          summary_text: match.summary_text || internship?.summary_text,
          tech_stack: match.tech_stack || internship?.tech_stack,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}