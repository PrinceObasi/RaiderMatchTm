import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopLocations(limit = 15) {
  return useQuery({
    queryKey: ["top-locations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internships')
        .select('location')
        .eq('is_active', true)
        .not('location', 'is', null)
        .neq('location', '') as { data: Array<{ location: string | null }> | null; error: any };

      if (error) {
        console.error("Error fetching top locations:", error);
        // Fallback to common locations if query fails
        return ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", "Boston, MA"];
      }

      // Build top locations from raw internship locations (City, ST)
      const rows = (data || []).map(r => (r.location ?? '').trim()).filter(Boolean);
      const counts = new Map<string, number>();
      for (const loc of rows) {
        counts.set(loc, (counts.get(loc) || 0) + 1);
      }
      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([loc]) => loc);
      let uniqueLocations = Array.from(new Set(sorted)).slice(0, limit);

      // Ensure Remote is first
      if (!uniqueLocations.includes("Remote")) {
        uniqueLocations = ["Remote", ...uniqueLocations];
      } else {
        uniqueLocations = ["Remote", ...uniqueLocations.filter((l) => l !== "Remote")];
      }
      return uniqueLocations;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
