import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Loader2 } from "lucide-react";
import { InternshipCard } from "@/components/InternshipCard";

interface Internship {
  id: string;
  company: string;
  title: string;
  city: string;
  description: string;
  skills: string[];
  visa_sponsorship: string;
  direct_link: string;
  application_url?: string;
}

interface InternshipResultsProps {
  internships: Internship[];
  isLoading: boolean;
  onApply: (internshipId: string, applyUrl: string) => void;
}

export function InternshipResults({ internships, isLoading, onApply }: InternshipResultsProps) {
  if (isLoading) {
    return (
      <Card className="card-shadow">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg mb-2">Searching internships...</p>
            <p className="text-muted-foreground">Finding the best matches for you</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (internships.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No internships found</p>
            <p>Try adjusting your search filters to find more opportunities.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardContent className="pt-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Found {internships.length} internship{internships.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="space-y-4 sm:space-y-6">
          {internships.map((internship) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              onApply={onApply}
              showApplicationToggle={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}