import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, ExternalLink, Loader2 } from "lucide-react";

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
            <Card key={internship.id} className="border hover:shadow-md transition-smooth">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">
                      {internship.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {internship.company}
                      </div>
                      {internship.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {internship.city}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {internship.visa_sponsorship && internship.visa_sponsorship !== 'Unspecified' && (
                      <Badge variant={internship.visa_sponsorship === 'Yes' ? 'default' : 'secondary'}>
                        {internship.visa_sponsorship === 'Yes' ? 'Sponsors Visa' : 'No Visa Sponsorship'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tech Stack */}
                {internship.skills && internship.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {internship.skills.slice(0, 8).map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {internship.skills.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{internship.skills.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Button 
                    onClick={() => onApply(internship.id, internship.direct_link)}
                    className="w-full sm:w-auto h-11"
                    size="lg"
                    disabled={!internship.direct_link}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apply Directly
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}