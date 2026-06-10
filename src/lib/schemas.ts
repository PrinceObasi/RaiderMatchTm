import { z } from 'zod';

export const JobSchema = z.object({
  title: z.string().min(3).max(120),
  company: z.string().min(2).max(120),
  city: z.string().min(2).max(120),
  description: z.string().min(20).max(5000),
  apply_url: z.string().url().startsWith('https://'),
  opens_at: z.string().or(z.date()),
  closes_at: z.string().or(z.date()).nullable(),
  is_active: z.boolean(),
  sponsors_visa: z.boolean().default(false),
  skills: z.array(z.string()).default([]),
  type: z.string().default('internship')
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
  job_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.string().default('applied'),
  hire_score: z.number().min(0).max(100).optional()
});

export const StudentUpdateSchema = StudentProfileSchema.partial().omit({
  email: true, // Email shouldn't be updated through profile updates
  name: true   // Name shouldn't be updated through profile updates
});

export const JobUpdateSchema = JobSchema.partial();

// For database inserts where we need to ensure required fields are included
export const StudentCreateSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  resume_url: z.string().optional(),
  skills: z.array(z.string()).default([]),
  is_international: z.boolean().default(false)
});

export const JobCreateSchema = JobSchema.extend({
  employer_id: z.string().uuid()
});