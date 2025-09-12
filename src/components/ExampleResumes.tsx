import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResumeCard } from "./ResumeCard";
import { Skeleton } from "./ui/skeleton";

interface ExampleResume {
  id: string;
  student_name: string;
  company: string;
  position: string;
  major: string;
  graduation_year: number;
  resume_url: string;
  description: string | null;
}

export function ExampleResumes() {
  const [resumes, setResumes] = useState<ExampleResume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExampleResumes();
  }, []);

  const fetchExampleResumes = async () => {
    try {
      const { data, error } = await supabase
        .from("example_resumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching example resumes:", error);
        return;
      }

      setResumes(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Example Resumes</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Download resume examples from TTU students who landed internships at top companies
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Example Resumes</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Download resume examples from TTU students who landed internships at top companies
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
    </div>
  );
}