import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRandomInternships } from "@/hooks/useRandomInternships";
import { RotateCw, Building, MapPin, ExternalLink, Sparkles } from "lucide-react";

interface RandomInternshipsProps {
  onApply?: (internshipId: string, applicationUrl: string) => void;
}

export function RandomInternships({ onApply }: RandomInternshipsProps) {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { toast } = useToast();
  
  const { data: internships = [], isLoading, error, refetch } = useRandomInternships({
    limit: 10,
    refreshCounter: refreshCounter
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      setRefreshCounter(prev => prev + 1);
      toast({
        title: "Roles refreshed!",
        description: `Found ${internships.length} new random internships for you.`,
      });
    } catch (err) {
      toast({
        title: "Failed to fetch random roles",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
    }
  };

  const handleApplyToInternship = (internshipId: string, applicationUrl: string) => {
    if (onApply) {
      onApply(internshipId, applicationUrl);
    } else {
      // Default behavior: open in new tab
      window.open(applicationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Failed to load random roles</p>
            <p className="text-sm mb-4">Please try refreshing</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Random Roles</CardTitle>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              variant="outline" 
              className="gap-2"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Roles
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover new opportunities with randomly selected internships
          </p>
        </CardHeader>
      </Card>

      {/* Internships Grid */}
      <div className="space-y-4">
        {isLoading ? (
          // Skeleton loader
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-18" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : internships.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No internships available</p>
                <p className="text-sm">Try refreshing to load new roles</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          internships.map((internship: any) => (
            <Card key={internship.id} className="border hover:shadow-md transition-smooth">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">
                      {internship.role_title || 'Software Engineering Intern'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {internship.company}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {internship.location}
                      </div>
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
                {internship.tech_stack && internship.tech_stack.length > 0 && (
                  <div className="mt-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      {internship.tech_stack.slice(0, 8).map((tech: string) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {internship.tech_stack.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{internship.tech_stack.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="mt-4">
                  <Button 
                    onClick={() => handleApplyToInternship(internship.id, internship.application_link || '')}
                    className="w-full sm:w-auto h-11"
                    size="lg"
                    disabled={!internship.application_link}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}