import React from 'react';
import { Building, MapPin, Calendar, ExternalLink, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyApplications, useToggleApplication } from '@/hooks/useMyApplications';
import { toast } from 'sonner';

export function MyApplications() {
  const { data: applications = [], isLoading, error } = useMyApplications();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Failed to load applications</p>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground mb-4">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No applications yet</p>
            <p className="text-sm">
              Start applying to internships and track them here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {applications.length} Application{applications.length !== 1 ? 's' : ''}
        </h2>
      </div>

      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}

interface ApplicationCardProps {
  application: NonNullable<ReturnType<typeof useMyApplications>['data']>[0];
}

function ApplicationCard({ application }: ApplicationCardProps) {
  const { unmarkApplied } = useToggleApplication(application.internship_id!);
  const internship = application.internship;

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this application from your tracking?')) {
      unmarkApplied();
    }
  };

  const handleViewPosting = () => {
    if (internship?.application_link) {
      window.open(internship.application_link, '_blank');
    } else {
      toast.error('No application link available');
    }
  };

  const statusColors = {
    applied: 'bg-blue-100 text-blue-800',
    interview: 'bg-yellow-100 text-yellow-800',
    offer: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-800',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight break-words">
              {internship?.role_title || 'Role Title Not Available'}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4 shrink-0" />
                <span className="break-words">{internship?.company || 'Company Not Available'}</span>
              </div>
              {internship?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{internship.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Applied {new Date(application.applied_at!).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={statusColors[application.status as keyof typeof statusColors] || statusColors.applied}
            >
              {application.status || 'applied'}
            </Badge>
            {internship?.visa_sponsorship && internship.visa_sponsorship !== 'Unspecified' && (
              <Badge variant={internship.visa_sponsorship === 'Yes' ? 'default' : 'secondary'}>
                {internship.visa_sponsorship === 'Yes' ? 'Sponsors Visa' : 'No Visa'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Tech stack */ }
        {internship?.tech_stack && internship.tech_stack.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {internship.tech_stack.map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Note */ }
        {application.note && (
          <div className="mb-4 p-2 bg-muted rounded text-sm">
            <strong>Note:</strong> {application.note}
          </div>
        )}

        {/* Actions */ }
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(application.last_updated_at).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewPosting}
              disabled={!internship?.application_link}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Posting
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}