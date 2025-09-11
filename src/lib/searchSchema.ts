import { z } from "zod";

export const SearchFiltersSchema = z.object({
  q: z.string().optional(),
  locations: z.array(z.string()).optional(),
  visa: z.enum(['any', 'yes', 'no']).default('any'),
  stacks: z.array(z.string()).optional(),
  respectGpa: z.boolean().default(false)
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const normalizeSearchParams = (filters: SearchFilters, userGpa?: number) => ({
  q: filters.q || null,
  locations: filters.locations?.length ? filters.locations : null,
  visa: filters.visa ?? 'any',
  stacks: filters.stacks?.length ? filters.stacks.map(s => s.toLowerCase()) : null,
  user_gpa: userGpa ?? null,
  respect_gpa: Boolean(filters.respectGpa),
  limit_count: 50,
  offset_count: 0
});