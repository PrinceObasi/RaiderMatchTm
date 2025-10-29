import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTopLocations(limit = 15) {
  return useQuery({
    queryKey: ["top-locations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internships')
        .select('location, locations, remote_flag')
        .eq('is_active', true)
        .or('not.location.is.null,not.locations.is.null') as {
          data: Array<{ location: string | null; locations: string[] | null; remote_flag: boolean | null }> | null;
          error: any;
        };

      if (error) {
        console.error("Error fetching top locations:", error);
        // Fallback to common locations if query fails
        return ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", "Boston, MA"];
      }

      // Build top locations from internship rows
      const counts = new Map<string, number>();
      const add = (loc: string | null | undefined) => {
        const val = (loc || '').trim();
        if (!val) return;
        counts.set(val, (counts.get(val) || 0) + 1);
      };

      const CITY_STATE_REGEX = /[A-Za-z.\- '\u2019]+,\s*[A-Z]{2}/g; // e.g., "Austin, TX"

      for (const row of data || []) {
        // Include Remote when flagged or mentioned in text
        if (row.remote_flag || /remote/i.test(row.location || '')) {
          add('Remote');
        }

        // Prefer structured array when available
        if (Array.isArray(row.locations) && row.locations.length > 0) {
          for (const l of row.locations) add(l);
        }

        // Parse messy concatenated strings like:
        // "4 locationsCoralville, IAProvidence, RIColumbus, OHNorwood, MA"
        const locStr = row.location || '';
        if (locStr) {
          const matches = locStr.match(CITY_STATE_REGEX);
          if (matches && matches.length) {
            for (const m of matches) add(m);
          } else {
            // Fallback to raw string if nothing matches pattern
            add(locStr);
          }
        }
      }

      // Sort by frequency and dedupe
      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([loc]) => loc);
      let uniqueLocations = Array.from(new Set(sorted)).slice(0, limit);

      // Ensure Remote is first
      if (!uniqueLocations.includes('Remote')) {
        uniqueLocations = ['Remote', ...uniqueLocations];
      } else {
        uniqueLocations = ['Remote', ...uniqueLocations.filter((l) => l !== 'Remote')];
      }
      return uniqueLocations;
    },
    staleTime: 1000 * 30, // 30 seconds - refresh quickly to show new locations
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
