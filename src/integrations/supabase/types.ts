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
      application_clicks: {
        Row: {
          apply_url: string
          clicked_at: string
          confirmation_date: string | null
          confirmed: boolean | null
          created_at: string
          id: string
          internship_id: string | null
          job_id: string | null
          user_id: string
        }
        Insert: {
          apply_url: string
          clicked_at?: string
          confirmation_date?: string | null
          confirmed?: boolean | null
          created_at?: string
          id?: string
          internship_id?: string | null
          job_id?: string | null
          user_id: string
        }
        Update: {
          apply_url?: string
          clicked_at?: string
          confirmation_date?: string | null
          confirmed?: boolean | null
          created_at?: string
          id?: string
          internship_id?: string | null
          job_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      application_events: {
        Row: {
          application_url: string
          created_at: string | null
          id: string
          internship_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          application_url: string
          created_at?: string | null
          id?: string
          internship_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          application_url?: string
          created_at?: string | null
          id?: string
          internship_id?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      internships: {
        Row: {
          application_link: string
          apply_url: string | null
          category: string | null
          company: string
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          employment_type: string | null
          id: string
          is_texas: boolean | null
          last_checked_utc: string | null
          location: string | null
          notes: string | null
          remote_flag: boolean | null
          role_title: string | null
          search_tsv: unknown | null
          source_url: string | null
          sponsorship_flag: string | null
          tech_stack: string[] | null
          updated_at: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
        }
        Insert: {
          application_link?: string
          apply_url?: string | null
          category?: string | null
          company: string
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          employment_type?: string | null
          id?: string
          is_texas?: boolean | null
          last_checked_utc?: string | null
          location?: string | null
          notes?: string | null
          remote_flag?: boolean | null
          role_title?: string | null
          search_tsv?: unknown | null
          source_url?: string | null
          sponsorship_flag?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          visa_sponsorship?: Database["public"]["Enums"]["visa_sponsorship_status"]
        }
        Update: {
          application_link?: string
          apply_url?: string | null
          category?: string | null
          company?: string
          created_at?: string | null
          date_posted?: string | null
          deadline?: string | null
          employment_type?: string | null
          id?: string
          is_texas?: boolean | null
          last_checked_utc?: string | null
          location?: string | null
          notes?: string | null
          remote_flag?: boolean | null
          role_title?: string | null
          search_tsv?: unknown | null
          source_url?: string | null
          sponsorship_flag?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          visa_sponsorship?: Database["public"]["Enums"]["visa_sponsorship_status"]
        }
        Relationships: []
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
      students: {
        Row: {
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
          phone: string | null
          project_depth: number | null
          resume_url: string | null
          skills: string[] | null
          sms_opt_in: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
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
          phone?: string | null
          project_depth?: number | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
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
          phone?: string | null
          project_depth?: number | null
          resume_url?: string | null
          skills?: string[] | null
          sms_opt_in?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
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
    }
    Functions: {
      can_view_applicant_data: {
        Args: { application_job_id: string }
        Returns: boolean
      }
      confirm_application: {
        Args: { click_id: string }
        Returns: Json
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
      match_internships: {
        Args:
          | { is_international?: boolean; student_skills: string[] }
          | { student_skills: string[] }
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
      random_internships: {
        Args: { limit_count?: number }
        Returns: {
          application_link: string
          apply_url: string | null
          category: string | null
          company: string
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          employment_type: string | null
          id: string
          is_texas: boolean | null
          last_checked_utc: string | null
          location: string | null
          notes: string | null
          remote_flag: boolean | null
          role_title: string | null
          search_tsv: unknown | null
          source_url: string | null
          sponsorship_flag: string | null
          tech_stack: string[] | null
          updated_at: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
        }[]
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
          category: string | null
          company: string
          created_at: string | null
          date_posted: string | null
          deadline: string | null
          employment_type: string | null
          id: string
          is_texas: boolean | null
          last_checked_utc: string | null
          location: string | null
          notes: string | null
          remote_flag: boolean | null
          role_title: string | null
          search_tsv: unknown | null
          source_url: string | null
          sponsorship_flag: string | null
          tech_stack: string[] | null
          updated_at: string | null
          visa_sponsorship: Database["public"]["Enums"]["visa_sponsorship_status"]
        }[]
      }
    }
    Enums: {
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
      visa_sponsorship_status: ["Yes", "No", "Unspecified"],
    },
  },
} as const
