import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InternshipSearchResult } from '../types';

export function useAllInternships() {
  return useQuery<InternshipSearchResult[]>({
    queryKey: ['internships-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enriched_active_internships' as any)
        .select('*')
        .order('date_posted', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Failed to fetch internships:', error);
        throw error;
      }

      return (data ?? []) as unknown as InternshipSearchResult[];
    },
    staleTime: 30_000,
  });
}
