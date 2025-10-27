import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopLocations(limit = 15) {
  return useQuery({
    queryKey: ["top-locations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_top_locations", { p_limit: limit }) as { data: string[] | null; error: any };

      if (error) {
        console.error("Error fetching top locations:", error);
        // Fallback to common locations if query fails
        return ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", "Boston, MA"];
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
