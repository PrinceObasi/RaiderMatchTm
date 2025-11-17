import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WorkExperienceSection } from "./WorkExperienceSection";
import { ProjectsSection } from "./ProjectsSection";
import { EducationSection } from "./EducationSection";
import { TechnicalSkillsSection } from "./TechnicalSkillsSection";
import { Loader2, Save } from "lucide-react";

interface ProfileData {
  gpa: number | null;
  graduation_year: number | null;
  major: string | null;
  class_year: 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad' | null;
  work_experience: WorkExperience[];
  projects: Project[];
  skills: string[];
}

export interface WorkExperience {
  company: string;
  position: string;
  start_date: string;
  end_date: string | null;
  description: string;
  current: boolean;
}

export interface Project {
  title: string;
  description: string;
  tech_stack: string[];
  url: string | null;
  start_date: string;
  end_date: string | null;
}

export function ProfileTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    gpa: null,
    graduation_year: null,
    major: null,
    class_year: null,
    work_experience: [],
    projects: [],
    skills: []
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("students")
        .select("gpa, graduation_year, major, class_year, work_experience, projects, skills")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData({
          gpa: data.gpa,
          graduation_year: data.graduation_year,
          major: data.major,
          class_year: data.class_year,
          work_experience: (data.work_experience as unknown as WorkExperience[]) || [],
          projects: (data.projects as unknown as Project[]) || [],
          skills: data.skills || []
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("students")
        .update({
          gpa: profileData.gpa,
          graduation_year: profileData.graduation_year,
          major: profileData.major,
          class_year: profileData.class_year,
          work_experience: profileData.work_experience as any,
          projects: profileData.projects as any,
          skills: profileData.skills
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground">Manage your profile information and showcase your experience</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <EducationSection
        gpa={profileData.gpa}
        graduationYear={profileData.graduation_year}
        major={profileData.major}
        classYear={profileData.class_year}
        onChange={(field, value) => setProfileData(prev => ({ ...prev, [field]: value }))}
      />

      <TechnicalSkillsSection
        skills={profileData.skills}
        onChange={(skills) => setProfileData(prev => ({ ...prev, skills }))}
      />

      <WorkExperienceSection
        experiences={profileData.work_experience}
        onChange={(experiences) => setProfileData(prev => ({ ...prev, work_experience: experiences }))}
      />

      <ProjectsSection
        projects={profileData.projects}
        onChange={(projects) => setProfileData(prev => ({ ...prev, projects }))}
      />
    </div>
  );
}
