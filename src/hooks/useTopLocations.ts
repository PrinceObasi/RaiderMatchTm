import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopLocations(limit = 15) {
  return useQuery({
    queryKey: ["top-locations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_top_locations", { p_limit: limit });

      if (error) {
        console.error("Error fetching top locations:", error);
        throw error;
      }

      // Always include Remote as a prominent option
      const locations = data || [];
      const uniqueLocations = Array.from(new Set(locations));
      
      // Ensure Remote is first
      if (!uniqueLocations.includes("Remote")) {
        uniqueLocations.unshift("Remote");
      } else {
        // Move Remote to first position
        const filtered = uniqueLocations.filter(loc => loc !== "Remote");
        filtered.unshift("Remote");
        return filtered;
      }
      
      return uniqueLocations;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
