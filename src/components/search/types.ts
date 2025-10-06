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
  tech_stack: string[] | null;
  visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
  application_link: string;
  direct_link: string;
  is_direct?: boolean | null;
  final_domain?: string | null;
  date_posted: string | null;
  deadline: string | null;
  jd_summary: string | null;
}