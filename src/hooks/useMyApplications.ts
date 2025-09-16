import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Application {
  id: string;
  internship_id: string | null;
  status: string | null;
  applied_at: string | null;
  last_updated_at: string;
  note: string | null;
  internship?: {
    id: string;
    company: string;
    role_title: string | null;
    location: string | null;
    tech_stack: string[] | null;
    application_link: string;
    visa_sponsorship: 'Yes' | 'No' | 'Unspecified';
    is_texas: boolean | null;
  } | null;
}

export function useMyApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          internship_id,
          status,
          applied_at,
          last_updated_at,
          note,
          internship:internships(
            id,
            company,
            role_title,
            location,
            tech_stack,
            application_link,
            visa_sponsorship,
            is_texas
          )
        `)
        .not('internship_id', 'is', null)
        .order('last_updated_at', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
    enabled: true,
  });
}

export function useToggleApplication(internshipId: string) {
  const queryClient = useQueryClient();
  const { data: applications = [] } = useMyApplications();
  
  const isApplied = applications.some(app => app.internship_id === internshipId);

  const markApplied = useMutation({
    mutationFn: async (payload: { status?: string; note?: string; applied_at?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('applications')
        .upsert({
          user_id: user.id,
          internship_id: internshipId,
          status: payload.status || 'applied',
          note: payload.note,
          applied_at: payload.applied_at || new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      
      // Snapshot previous value
      const previousApplications = queryClient.getQueryData<Application[]>(['applications']);
      
      // Optimistically update
      const newApplication: Application = {
        id: 'temp-id',
        internship_id: internshipId,
        status: (payload.status as any) || 'applied',
        applied_at: payload.applied_at || new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        note: payload.note || null,
      };
      
      queryClient.setQueryData<Application[]>(['applications'], old => {
        if (!old) return [newApplication];
        const filtered = old.filter(app => app.internship_id !== internshipId);
        return [newApplication, ...filtered];
      });
      
      return { previousApplications };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['applications'], context?.previousApplications);
      toast.error('Failed to save application');
    },
    onSuccess: () => {
      toast.success('Saved to My Applications');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const unmarkApplied = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('user_id', user.id)
        .eq('internship_id', internshipId);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      
      const previousApplications = queryClient.getQueryData<Application[]>(['applications']);
      
      queryClient.setQueryData<Application[]>(['applications'], old => {
        if (!old) return [];
        return old.filter(app => app.internship_id !== internshipId);
      });
      
      return { previousApplications };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['applications'], context?.previousApplications);
      toast.error('Failed to remove application');
    },
    onSuccess: () => {
      toast.success('Removed from My Applications');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  return {
    isApplied,
    markApplied: markApplied.mutate,
    unmarkApplied: unmarkApplied.mutate,
    isLoading: markApplied.isPending || unmarkApplied.isPending,
  };
}