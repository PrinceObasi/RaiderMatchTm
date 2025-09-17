import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RandomInternshipsParams {
  limit?: number;
  enabled?: boolean;
}

export function useRandomInternships({ limit = 10, enabled = true, refreshCounter = 0 }: RandomInternshipsParams & { refreshCounter?: number } = {}) {
  return useQuery({
    queryKey: ['random-internships', limit, refreshCounter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('random_internships', {
        limit_count: limit
      });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled,
    staleTime: 0, // Always refetch when requested
    gcTime: 0, // Don't cache results
  });
}