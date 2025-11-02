import { z } from 'zod';

export const FilterSchema = z.object({
  q: z.string().trim().optional(),
  locations: z.array(z.string()).optional(),
  visa: z.enum(['any', 'yes', 'no']).default('any'),
  stacks: z.array(z.string()).optional(),
});

export type FilterFormData = z.infer<typeof FilterSchema>;

export interface NormalizedParams {
  q: string | null;
  locations: string[] | null;
  visa: 'any' | 'yes' | 'no';
  stacks: string[] | null;
  limit_count: number;
  offset_count: number;
}

export interface InternshipSearchResult {
  id: string;
  company: string;
  role_title: string | null;
  location: string | null;
  application_link: string;
  created_at: string | null;
  summary_text: string | null;
  tech_stack: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
}