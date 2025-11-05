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
      // Get current user's student ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get student record to find student ID
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !student) {
        console.error('Error fetching student:', studentError);
        throw new Error('Student profile not found');
      }

      // Call the intelligent matching function
      const { data, error } = await supabase.rpc('match_internships_for_user', {
        p_user_id: student.id,
        p_limit: limit
      });

      if (error) {
        console.error('Error fetching matches:', error);
        throw error;
      }

      // Ensure match_count is present, default to 0 if missing
      return (data || []).map((item: any) => ({
        ...item,
        match_count: item.match_count ?? 0
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}