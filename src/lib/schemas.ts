import { z } from 'zod';

export const JobSchema = z.object({
  p_role_title: z.string().trim().min(3).max(120),
  p_location: z.string().trim().min(2).max(120),
  p_description_text: z.string().trim().min(20).max(5000),
  p_application_url: z.string().url().startsWith('https://').max(2048),
  p_date_posted: z.string().date(),
  p_deadline: z.string().date().optional(),
  p_tech_stack: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
  p_is_texas: z.boolean(),
  p_visa_sponsorship: z.enum(['Yes', 'No', 'Unspecified']).default('Unspecified'),
}).superRefine((job, context) => {
  if (job.p_deadline && job.p_deadline < job.p_date_posted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['p_deadline'],
      message: 'Deadline must not precede the post date',
    });
  }
});

export const StudentProfileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  major: z.string().min(2).max(100).optional(),
  graduation_year: z.number().int().min(2020).max(2030).optional(),
  gpa: z.number().min(0).max(4).optional(),
  has_prev_intern: z.boolean().default(false),
  github: z.string().min(1).optional(),
  phone: z.string().optional(),
  sms_opt_in: z.boolean().optional(),
  is_international: z.boolean().default(false),
  project_depth: z.number().min(0).max(100).default(0),
  skills: z.array(z.string()).default([])
});

export const ApplicationSchema = z.object({
  internship_id: z.string().uuid().nullable().optional(),
  status: z.enum([
    'saved', 'applied', 'assessment', 'interview',
    'offer', 'rejected', 'withdrawn', 'no_response',
  ]).default('applied'),
  external_company: z.string().trim().min(1).max(120).optional(),
  external_role_title: z.string().trim().min(1).max(120).optional(),
  external_url: z.string().url().max(2048).optional(),
  external_location: z.string().trim().max(120).optional(),
  deadline: z.string().date().optional(),
  note: z.string().max(10000).optional(),
});

export const StudentUpdateSchema = StudentProfileSchema.partial().omit({
  email: true, // Email shouldn't be updated through profile updates
  name: true   // Name shouldn't be updated through profile updates
});

// For database inserts where we need to ensure required fields are included
export const StudentCreateSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  resume_url: z.string().optional(),
  skills: z.array(z.string()).default([]),
  is_international: z.boolean().default(false)
});

export const JobCreateSchema = JobSchema;
