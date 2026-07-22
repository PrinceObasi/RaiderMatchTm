export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      app_secrets: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_at: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          changed_at?: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          changed_at?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_timeline: {
        Row: {
          application_id: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_timeline_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          hire_score: number | null
          id: string
          internship_id: string | null
          last_updated_at: string
          note: string | null
          status: string | null
          status_changed_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          hire_score?: number | null
          id?: string
          internship_id?: string | null
          last_updated_at?: string
          note?: string | null
          status?: string | null
          status_changed_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          hire_score?: number | null
          id?: string
          internship_id?: string | null
          last_updated_at?: string
          note?: string | null
          status?: string | null
          status_changed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      example_resumes: {
        Row: {
          company: string
          created_at: string
          description: string | null
          graduation_year: number
          id: string
          major: string
          position: string
          resume_url: string
          student_name: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          graduation_year: number
          id?: string
          major: string
          position: string
          resume_url: string
          student_name: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          graduation_year?: number
          id?: string
          major?: string
          position?: string
          resume_url?: string
          student_name?: string
        }
        Relationships: []
      }
      internship_validation_history: {
        Row: {
          created_at: string
          id: string
          internship_id: string
          message: string | null
          status_code: number | null
          was_valid: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          internship_id: string
          message?: string | null
          status_code?: number | null
          was_valid: boolean
        }
        Update: {
          created_at?: string
          id?: string
          internship_id?: string
          message?: string | null
          status_code?: number | null
          was_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "internship_validation_history_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_validation_history_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_validation_history_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internships: {
        Row: {
          application_link: string
          apply_url: string | null
          archived_at: string | null
          category: string | null
          clearance_required: boolean | null
          company: string
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          us_citizen_required: boolean | null
          validation_message: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string | null
        }
        Insert: {
          application_link?: string
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          clearance_required?: boolean | null
          company: string
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link: string
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          us_citizen_required?: boolean | null
          validation_message?: string | null
          visa_sponsorship?: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode?: string | null
        }
        Update: {
          application_link?: string
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          clearance_required?: boolean | null
          company?: string
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link?: string
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          us_citizen_required?: boolean | null
          validation_message?: string | null
          visa_sponsorship?: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          internship_id: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          internship_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          internship_id?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_events_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          classification: string | null
          created_at: string
          graduation_year: number | null
          id: string
          resume_keywords: string[] | null
          selected_skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          classification?: string | null
          created_at?: string
          graduation_year?: number | null
          id?: string
          resume_keywords?: string[] | null
          selected_skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          classification?: string | null
          created_at?: string
          graduation_year?: number | null
          id?: string
          resume_keywords?: string[] | null
          selected_skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          internship_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          internship_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          internship_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_sync_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          errors: string[] | null
          id: string
          jobs_deactivated: number
          jobs_enrich_failed: number
          jobs_enriched: number
          jobs_inserted: number
          jobs_reactivated: number
          new_jobs_found: number
          skipped_advanced_degree: number
          skipped_duplicates: number
          skipped_international: number
          skipped_non_swe: number
          status: string
          sync_type: string
          total_source_listings: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          errors?: string[] | null
          id?: string
          jobs_deactivated?: number
          jobs_enrich_failed?: number
          jobs_enriched?: number
          jobs_inserted?: number
          jobs_reactivated?: number
          new_jobs_found?: number
          skipped_advanced_degree?: number
          skipped_duplicates?: number
          skipped_international?: number
          skipped_non_swe?: number
          status?: string
          sync_type?: string
          total_source_listings?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          errors?: string[] | null
          id?: string
          jobs_deactivated?: number
          jobs_enrich_failed?: number
          jobs_enriched?: number
          jobs_inserted?: number
          jobs_reactivated?: number
          new_jobs_found?: number
          skipped_advanced_degree?: number
          skipped_duplicates?: number
          skipped_international?: number
          skipped_non_swe?: number
          status?: string
          sync_type?: string
          total_source_listings?: number
        }
        Relationships: []
      }
      scrape_sync_settings: {
        Row: {
          created_at: string
          id: number
          interval_hours: number
          is_enabled: boolean
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          interval_hours?: number
          is_enabled?: boolean
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          interval_hours?: number
          is_enabled?: boolean
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_events: {
        Row: {
          created_at: string | null
          id: string
          location_filters: string[] | null
          query_text: string | null
          result_count: number | null
          tech_filters: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_filters?: string[] | null
          query_text?: string | null
          result_count?: number | null
          tech_filters?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_filters?: string[] | null
          query_text?: string | null
          result_count?: number | null
          tech_filters?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      skill_aliases: {
        Row: {
          alias: string
          canonical: string
        }
        Insert: {
          alias: string
          canonical: string
        }
        Update: {
          alias?: string
          canonical?: string
        }
        Relationships: []
      }
      student_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferred_company_stages: string[] | null
          preferred_roles: string[] | null
          preferred_work_mode: string | null
          student_id: string
          tech_interests: string[] | null
          updated_at: string | null
          work_authorization: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_company_stages?: string[] | null
          preferred_roles?: string[] | null
          preferred_work_mode?: string | null
          student_id: string
          tech_interests?: string[] | null
          updated_at?: string | null
          work_authorization?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_company_stages?: string[] | null
          preferred_roles?: string[] | null
          preferred_work_mode?: string | null
          student_id?: string
          tech_interests?: string[] | null
          updated_at?: string | null
          work_authorization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          biggest_challenge: string | null
          class_year: Database["public"]["Enums"]["class_year"] | null
          Classification: string | null
          created_at: string
          degree: string | null
          devpost_url: string | null
          email: string
          github: string | null
          gpa: number | null
          grad_month: number | null
          graduation_year: number | null
          has_prev_intern: boolean | null
          id: string
          is_international: boolean | null
          kaggle_url: string | null
          leetcode_url: string | null
          linkedin_url: string | null
          location_city: string | null
          location_state: string | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          portfolio_url: string | null
          project_depth: number | null
          projects: Json | null
          resume_path: string | null
          resume_uploaded: boolean | null
          resume_url: string | null
          skills: string[] | null
          sms_opt_in: boolean | null
          tech_stack: string[] | null
          university: string | null
          updated_at: string
          user_id: string
          work_experience: Json | null
        }
        Insert: {
          biggest_challenge?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          Classification?: string | null
          created_at?: string
          degree?: string | null
          devpost_url?: string | null
          email: string
          github?: string | null
          gpa?: number | null
          grad_month?: number | null
          graduation_year?: number | null
          has_prev_intern?: boolean | null
          id?: string
          is_international?: boolean | null
          kaggle_url?: string | null
          leetcode_url?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_state?: string | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          project_depth?: number | null
          projects?: Json | null
          resume_path?: string | null
          resume_uploaded?: boolean | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          tech_stack?: string[] | null
          university?: string | null
          updated_at?: string
          user_id: string
          work_experience?: Json | null
        }
        Update: {
          biggest_challenge?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          Classification?: string | null
          created_at?: string
          degree?: string | null
          devpost_url?: string | null
          email?: string
          github?: string | null
          gpa?: number | null
          grad_month?: number | null
          graduation_year?: number | null
          has_prev_intern?: boolean | null
          id?: string
          is_international?: boolean | null
          kaggle_url?: string | null
          leetcode_url?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          project_depth?: number | null
          projects?: Json | null
          resume_path?: string | null
          resume_uploaded?: boolean | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          tech_stack?: string[] | null
          university?: string | null
          updated_at?: string
          user_id?: string
          work_experience?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      active_internships: {
        Row: {
          application_link: string | null
          apply_url: string | null
          archived_at: string | null
          category: string | null
          company: string | null
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string | null
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string | null
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          validation_message: string | null
          visa_sponsorship:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode: string | null
        }
        Insert: {
          application_link?: string | null
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          company?: string | null
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link?: string | null
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string | null
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          validation_message?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Update: {
          application_link?: string | null
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          company?: string | null
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link?: string | null
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string | null
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          validation_message?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      enriched_active_internships: {
        Row: {
          application_link: string | null
          apply_url: string | null
          archived_at: string | null
          category: string | null
          company: string | null
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string | null
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string | null
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          validation_message: string | null
          visa_sponsorship:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode: string | null
        }
        Insert: {
          application_link?: string | null
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          company?: string | null
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link?: string | null
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string | null
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          validation_message?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Update: {
          application_link?: string | null
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
          company?: string | null
          core_requirements?: string[] | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_html?: string | null
          description_text?: string | null
          direct_link?: string | null
          direct_url?: string | null
          duplicate_of?: string | null
          employment_type?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number | null
          enrichment_confidence?: number | null
          extraction_attempts?: number | null
          final_domain?: string | null
          id?: string | null
          is_active?: boolean | null
          is_direct?: boolean | null
          is_texas?: boolean | null
          jd_raw?: string | null
          jd_summary?: string | null
          job_keywords?: string[] | null
          last_checked_utc?: string | null
          last_validated_at?: string | null
          last_verified_at?: string | null
          link_extracted_at?: string | null
          link_resolved_at?: string | null
          link_type?: string | null
          link_valid?: boolean | null
          location?: string | null
          locations?: string[] | null
          needs_review?: boolean | null
          notes?: string | null
          remote_flag?: boolean | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          review_reason?: string[] | null
          role_title?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          scrape_source?: string | null
          search_tsv?: unknown
          source?: string | null
          source_url?: string | null
          sponsorship_flag?: string | null
          summary_line_count?: number | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          validation_message?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "enriched_active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analytics_application_rate: {
        Args: never
        Returns: {
          apply_count: number
          unique_users: number
          week_start: string
        }[]
      }
      analytics_most_searched_tech: {
        Args: { p_limit?: number }
        Returns: {
          search_count: number
          tech: string
        }[]
      }
      analytics_overview: {
        Args: never
        Returns: {
          active_internships: number
          applications_this_week: number
          avg_skills_per_student: number
          students_this_week: number
          total_applications: number
          total_internships: number
          total_students: number
          unique_applicants: number
        }[]
      }
      analytics_signup_growth: {
        Args: never
        Returns: {
          cumulative: number
          signup_count: number
          week_start: string
        }[]
      }
      analytics_top_companies: {
        Args: { p_limit?: number }
        Returns: {
          avg_tech_count: number
          company: string
          listing_count: number
        }[]
      }
      analytics_top_tech_stacks: {
        Args: { p_limit?: number }
        Returns: {
          internship_count: number
          tag: string
        }[]
      }
      can_view_applicant_data: {
        Args: { application_job_id: string }
        Returns: boolean
      }
      check_application: { Args: { p_internship_id: string }; Returns: Json }
      delete_user_data: {
        Args: { p_user_id: string; p_user_type: string }
        Returns: undefined
      }
      explore_internships: {
        Args: {
          p_cities?: string[]
          p_limit?: number
          p_offset?: number
          p_stacks?: string[]
          p_visa?: string
        }
        Returns: {
          application_link: string
          apply_url: string | null
          archived_at: string | null
          category: string | null
          company: string
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          validation_message: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "internships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_applicant_info: {
        Args: { p_job_id: string }
        Returns: {
          application_id: string
          applied_at: string
          email: string
          graduation_year: number
          hire_score: number
          major: string
          name: string
          skills: string[]
          status: string
          student_id: string
        }[]
      }
      get_application_timeline: {
        Args: { p_application_id: string }
        Returns: {
          created_at: string
          from_status: string
          id: string
          note: string
          to_status: string
        }[]
      }
      get_application_tracker:
        | {
            Args: never
            Returns: {
              application_id: string
              application_link: string
              applied_at: string
              company: string
              days_in_status: number
              deadline: string
              direct_link: string
              internship_id: string
              last_updated_at: string
              location: string
              note: string
              role_title: string
              status: string
              status_changed_at: string
              tech_stack: string[]
              timeline_count: number
              work_mode: string
            }[]
          }
        | {
            Args: { p_user_id?: string }
            Returns: {
              application_id: string
              application_link: string
              applied_at: string
              company: string
              days_in_status: number
              deadline: string
              direct_link: string
              hire_score: number
              internship_id: string
              last_updated_at: string
              location: string
              note: string
              role_title: string
              status: string
              status_history: Json
              tech_stack: string[]
              work_mode: string
            }[]
          }
      get_internships_needing_enrichment: {
        Args: { p_limit?: number }
        Returns: {
          application_link: string
          apply_url: string | null
          archived_at: string | null
          category: string | null
          company: string
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          validation_message: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "internships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_admin_analytics: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      get_top_locations: {
        Args: { p_limit?: number }
        Returns: {
          location_name: string
        }[]
      }
      get_tracker_stats: { Args: never; Returns: Json }
      get_tracker_summary: {
        Args: { p_user_id?: string }
        Returns: {
          count: number
          status: string
        }[]
      }
      match_internships_for_user: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          company: string
          id: string
          location: string
          match_count: number
          matched_tags: string[]
          role_title: string
          summary_text: string
          tech_stack: string[]
          work_mode: string
        }[]
      }
      match_internships_for_user_v2: {
        Args: { p_user_id: string }
        Returns: {
          application_link: string
          company: string
          date_posted: string
          internship_id: string
          location: string
          overlap_count: number
          role_title: string
          salary_currency: string
          salary_max: number
          salary_min: number
          summary_text: string
          tech_overlap: string[]
          tech_stack: string[]
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string
        }[]
      }
      match_internships_weighted: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          application_link: string
          company: string
          composite_score: number
          date_posted: string
          deadline: string
          direct_link: string
          experience_score: number
          gpa_score: number
          id: string
          link_type: string
          location: string
          matched_count: number
          matched_tags: string[]
          missing_skills: string[]
          preference_score: number
          recency_score: number
          role_title: string
          salary_currency: string
          salary_max: number
          salary_min: number
          skill_overlap_ratio: number
          summary_text: string
          tech_stack: string[]
          total_required: number
          visa_sponsorship: string
          work_mode: string
        }[]
      }
      norm_text: { Args: { t: string }; Returns: string }
      normalize_keywords: { Args: { raw: string[] }; Returns: string[] }
      random_internships: {
        Args: { limit_count?: number }
        Returns: {
          application_link: string
          apply_url: string | null
          archived_at: string | null
          category: string | null
          company: string
          core_requirements: string[] | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_html: string | null
          description_text: string | null
          direct_link: string
          direct_url: string | null
          duplicate_of: string | null
          employment_type: string | null
          enriched_at: string | null
          enrichment_attempts: number | null
          enrichment_confidence: number | null
          extraction_attempts: number | null
          final_domain: string | null
          id: string
          is_active: boolean | null
          is_direct: boolean | null
          is_texas: boolean | null
          jd_raw: string | null
          jd_summary: string | null
          job_keywords: string[] | null
          last_checked_utc: string | null
          last_validated_at: string | null
          last_verified_at: string | null
          link_extracted_at: string | null
          link_resolved_at: string | null
          link_type: string | null
          link_valid: boolean | null
          location: string | null
          locations: string[] | null
          needs_review: boolean | null
          notes: string | null
          remote_flag: boolean | null
          requirements: string[] | null
          responsibilities: string[] | null
          review_reason: string[] | null
          role_title: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          scrape_source: string | null
          search_tsv: unknown
          source: string | null
          source_url: string | null
          sponsorship_flag: string | null
          summary_line_count: number | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          validation_message: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "internships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resolve_skill: { Args: { raw_skill: string }; Returns: string }
      save_application: {
        Args: { p_internship_id: string; p_status?: string }
        Returns: Json
      }
      save_internship: { Args: { p_internship_id: string }; Returns: Json }
      search_internships:
        | {
            Args: {
              limit_count?: number
              locations?: string[]
              offset_count?: number
              q?: string
              respect_gpa?: boolean
              stacks?: string[]
              user_gpa?: number
              visa?: string
            }
            Returns: {
              application_link: string
              apply_url: string | null
              archived_at: string | null
              category: string | null
              company: string
              core_requirements: string[] | null
              created_at: string | null
              date_posted: string | null
              deadline: string | null
              description_html: string | null
              description_text: string | null
              direct_link: string
              direct_url: string | null
              duplicate_of: string | null
              employment_type: string | null
              enriched_at: string | null
              enrichment_attempts: number | null
              enrichment_confidence: number | null
              extraction_attempts: number | null
              final_domain: string | null
              id: string
              is_active: boolean | null
              is_direct: boolean | null
              is_texas: boolean | null
              jd_raw: string | null
              jd_summary: string | null
              job_keywords: string[] | null
              last_checked_utc: string | null
              last_validated_at: string | null
              last_verified_at: string | null
              link_extracted_at: string | null
              link_resolved_at: string | null
              link_type: string | null
              link_valid: boolean | null
              location: string | null
              locations: string[] | null
              needs_review: boolean | null
              notes: string | null
              remote_flag: boolean | null
              requirements: string[] | null
              responsibilities: string[] | null
              review_reason: string[] | null
              role_title: string | null
              salary_currency: string | null
              salary_max: number | null
              salary_min: number | null
              salary_period: string | null
              scrape_source: string | null
              search_tsv: unknown
              source: string | null
              source_url: string | null
              sponsorship_flag: string | null
              summary_line_count: number | null
              summary_text: string | null
              tech_stack: string[] | null
              updated_at: string | null
              validation_message: string | null
              visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
              work_mode: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "internships"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_limit: number; p_offset: number; q: string }
            Returns: {
              application_link: string | null
              apply_url: string | null
              archived_at: string | null
              category: string | null
              company: string | null
              core_requirements: string[] | null
              created_at: string | null
              date_posted: string | null
              deadline: string | null
              description_html: string | null
              description_text: string | null
              direct_link: string | null
              direct_url: string | null
              duplicate_of: string | null
              employment_type: string | null
              enriched_at: string | null
              enrichment_attempts: number | null
              enrichment_confidence: number | null
              extraction_attempts: number | null
              final_domain: string | null
              id: string | null
              is_active: boolean | null
              is_direct: boolean | null
              is_texas: boolean | null
              jd_raw: string | null
              jd_summary: string | null
              job_keywords: string[] | null
              last_checked_utc: string | null
              last_validated_at: string | null
              last_verified_at: string | null
              link_extracted_at: string | null
              link_resolved_at: string | null
              link_type: string | null
              link_valid: boolean | null
              location: string | null
              locations: string[] | null
              needs_review: boolean | null
              notes: string | null
              remote_flag: boolean | null
              requirements: string[] | null
              responsibilities: string[] | null
              review_reason: string[] | null
              role_title: string | null
              salary_currency: string | null
              salary_max: number | null
              salary_min: number | null
              salary_period: string | null
              scrape_source: string | null
              search_tsv: unknown
              source: string | null
              source_url: string | null
              sponsorship_flag: string | null
              summary_line_count: number | null
              summary_text: string | null
              tech_stack: string[] | null
              updated_at: string | null
              validation_message: string | null
              visa_sponsorship:
                | Database["public"]["Enums"]["visa_sponsorship_status"]
                | null
              work_mode: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "active_internships"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      set_profile_keywords: {
        Args: { p_user_id: string; raw: string[] }
        Returns: undefined
      }
      update_application_status: {
        Args: {
          p_application_id: string
          p_new_status: string
          p_note?: string
        }
        Returns: Json
      }
    }
    Enums: {
      class_year: "freshman" | "sophomore" | "junior" | "senior" | "grad"
      visa_sponsorship_status: "Yes" | "No" | "Unspecified"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      class_year: ["freshman", "sophomore", "junior", "senior", "grad"],
      visa_sponsorship_status: ["Yes", "No", "Unspecified"],
    },
  },
} as const
