import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopLocations(limit = 15) {
  return useQuery({
    queryKey: ["top-locations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_top_locations", { p_limit: limit }) as { data: Array<{ location_name: string }> | null; error: any };

      if (error) {
        console.error("Error fetching top locations:", error);
        // Fallback to common locations if query fails
        return ["Remote", "Austin, TX"];
      }

      // Extract location_name from each object
      const locations = (data || []).map(item => item.location_name);
      const uniqueLocations = Array.from(new Set(locations));
      
      return uniqueLocations;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
