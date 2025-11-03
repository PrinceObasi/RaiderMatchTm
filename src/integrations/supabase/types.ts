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
      applications: {
        Row: {
          applied_at: string | null
          hire_score: number | null
          id: string
          internship_id: string | null
          job_id: string | null
          last_updated_at: string
          note: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          hire_score?: number | null
          id?: string
          internship_id?: string | null
          job_id?: string | null
          last_updated_at?: string
          note?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          hire_score?: number | null
          id?: string
          internship_id?: string | null
          job_id?: string | null
          last_updated_at?: string
          note?: string | null
          status?: string | null
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
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "jobs_for_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "ux_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_job_fk"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: number
          internship_id: string | null
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: number
          internship_id?: string | null
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: number
          internship_id?: string | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "active_internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "jobs_for_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "ux_internships"
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
        }
        Insert: {
          application_link?: string
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
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
          validation_message?: string | null
          visa_sponsorship?: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode?: string | null
        }
        Update: {
          application_link?: string
          apply_url?: string | null
          archived_at?: string | null
          category?: string | null
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
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "jobs_for_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internships_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "ux_internships"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          internship_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          internship_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          internship_id?: string | null
          user_id?: string
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
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "jobs_for_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_events_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "ux_internships"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string | null
          city: string
          closes_at: string | null
          company: string
          created_at: string
          deadline: string | null
          description: string
          employer_id: string | null
          id: string
          is_active: boolean | null
          opens_at: string | null
          posted_date: string
          skills: string[]
          sponsors_visa: boolean | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          city: string
          closes_at?: string | null
          company: string
          created_at?: string
          deadline?: string | null
          description: string
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          opens_at?: string | null
          posted_date?: string
          skills?: string[]
          sponsors_visa?: boolean | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          city?: string
          closes_at?: string | null
          company?: string
          created_at?: string
          deadline?: string | null
          description?: string
          employer_id?: string | null
          id?: string
          is_active?: boolean | null
          opens_at?: string | null
          posted_date?: string
          skills?: string[]
          sponsors_visa?: boolean | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          resume_keywords: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resume_keywords?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resume_keywords?: string[] | null
          updated_at?: string
          user_id?: string
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
      students: {
        Row: {
          biggest_challenge: string | null
          class_year: Database["public"]["Enums"]["class_year"] | null
          created_at: string
          email: string
          github: string | null
          gpa: number | null
          graduation_year: number | null
          has_prev_intern: boolean | null
          id: string
          is_international: boolean | null
          major: string | null
          name: string
          onboarding_completed: boolean | null
          phone: string | null
          project_depth: number | null
          projects: Json | null
          resume_uploaded: boolean | null
          resume_url: string | null
          skills: string[] | null
          sms_opt_in: boolean | null
          updated_at: string
          user_id: string
          work_experience: Json | null
        }
        Insert: {
          biggest_challenge?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          email: string
          github?: string | null
          gpa?: number | null
          graduation_year?: number | null
          has_prev_intern?: boolean | null
          id?: string
          is_international?: boolean | null
          major?: string | null
          name: string
          onboarding_completed?: boolean | null
          phone?: string | null
          project_depth?: number | null
          projects?: Json | null
          resume_uploaded?: boolean | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          updated_at?: string
          user_id: string
          work_experience?: Json | null
        }
        Update: {
          biggest_challenge?: string | null
          class_year?: Database["public"]["Enums"]["class_year"] | null
          created_at?: string
          email?: string
          github?: string | null
          gpa?: number | null
          graduation_year?: number | null
          has_prev_intern?: boolean | null
          id?: string
          is_international?: boolean | null
          major?: string | null
          name?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          project_depth?: number | null
          projects?: Json | null
          resume_uploaded?: boolean | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          updated_at?: string
          user_id?: string
          work_experience?: Json | null
        }
        Relationships: []
      }
      tech_tags: {
        Row: {
          tag: string
        }
        Insert: {
          tag: string
        }
        Update: {
          tag?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_internships: {
        Row: {
          application_link: string | null
          company: string | null
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          description_text: string | null
          direct_link: string | null
          enriched_at: string | null
          id: string | null
          location: string | null
          remote_flag: boolean | null
          role_title: string | null
          salary_max: number | null
          salary_min: number | null
          source: string | null
          summary_text: string | null
          tech_stack: string[] | null
          updated_at: string | null
          visa_sponsorship:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode: string | null
        }
        Insert: {
          application_link?: string | null
          company?: string | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_text?: string | null
          direct_link?: string | null
          enriched_at?: string | null
          id?: string | null
          location?: string | null
          remote_flag?: boolean | null
          role_title?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Update: {
          application_link?: string | null
          company?: string | null
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          description_text?: string | null
          direct_link?: string | null
          enriched_at?: string | null
          id?: string | null
          location?: string | null
          remote_flag?: boolean | null
          role_title?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source?: string | null
          summary_text?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          visa_sponsorship?:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
          work_mode?: string | null
        }
        Relationships: []
      }
      jobs_for_app: {
        Row: {
          application_url: string | null
          city: string | null
          closes_at: string | null
          company: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          opens_at: string | null
          skills: string[] | null
          title: string | null
          type: string | null
          updated_at: string | null
          visa_sponsorship:
            | Database["public"]["Enums"]["visa_sponsorship_status"]
            | null
        }
        Relationships: []
      }
      ux_internships: {
        Row: {
          application_link: string | null
          company: string | null
          created_at: string | null
          id: string | null
          location: string | null
          role_title: string | null
          summary_text: string | null
          tech_stack: string[] | null
        }
        Insert: {
          application_link?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          location?: string | null
          role_title?: string | null
          summary_text?: string | null
          tech_stack?: string[] | null
        }
        Update: {
          application_link?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          location?: string | null
          role_title?: string | null
          summary_text?: string | null
          tech_stack?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_applicant_data: {
        Args: { application_job_id: string }
        Returns: boolean
      }
      confirm_application: { Args: { click_id: string }; Returns: Json }
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
          gpa: number
          graduation_year: number
          has_prev_intern: boolean
          hire_score: number
          is_international: boolean
          major: string
          name: string
          skills: string[]
          status: string
          student_id: string
        }[]
      }
      get_top_locations: {
        Args: { p_limit?: number }
        Returns: {
          location_name: string
        }[]
      }
      match_internships:
        | {
            Args: { student_skills: string[] }
            Returns: {
              city: string
              company: string
              description: string
              id: string
              similarity: number
              skills: string[]
              title: string
            }[]
          }
        | {
            Args: { is_international?: boolean; student_skills: string[] }
            Returns: {
              city: string
              company: string
              description: string
              id: string
              similarity: number
              skills: string[]
              title: string
            }[]
          }
      match_internships_for_user: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          application_link: string
          company: string
          date_posted: string
          deadline: string
          description_text: string
          direct_link: string
          id: string
          link_type: string
          location: string
          role_title: string
          summary_text: string
          tech_stack: string[]
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
          work_mode: string
        }[]
      }
      match_jobs: {
        Args: { p_student_id: string }
        Returns: {
          application_url: string
          city: string
          company: string
          description: string
          id: string
          missing_skills: string[]
          overlap: number
          skills: string[]
          title: string
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
      search_internships: {
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
      set_job_keywords: {
        Args: { p_job_id: string; raw: string[] }
        Returns: undefined
      }
      set_profile_keywords: {
        Args: { p_user_id: string; raw: string[] }
        Returns: undefined
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
