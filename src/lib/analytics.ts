import { supabase } from "@/integrations/supabase/client";

/**
 * Analytics query examples for RaiderMatch
 */

// a) Count total signups grouped by year and is_international
export async function getSignupsByYearAndStatus() {
  const { data, error } = await supabase
    .from('students')
    .select('class_year, is_international, created_at')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Group and count
  const grouped = data?.reduce((acc: any, student) => {
    const key = `${student.class_year || 'unknown'}_${student.is_international ? 'international' : 'domestic'}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  return grouped;
}

// b) Top 10 internships by apply_click count
export async function getTopInternshipsByApplyClicks(limit = 10) {
  const { data: events, error } = await supabase
    .from('job_events')
    .select('internship_id, internships(company, role_title)')
    .eq('event_type', 'apply_click');
  
  if (error) throw error;
  
  const grouped = events?.reduce((acc: any, event) => {
    const id = event.internship_id;
    if (!acc[id]) {
      acc[id] = { internship_id: id, count: 0, internship: event.internships };
    }
    acc[id].count++;
    return acc;
  }, {});
  
  return Object.values(grouped || {})
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, limit);
}

// c) Ratio of international vs. domestic users
export async function getInternationalRatio() {
  const { data, error } = await supabase
    .from('students')
    .select('is_international');
  
  if (error) throw error;
  
  const total = data?.length || 0;
  const international = data?.filter(s => s.is_international).length || 0;
  const domestic = total - international;
  
  return {
    total,
    international,
    domestic,
    ratio: total > 0 ? international / total : 0
  };
}

// d) Average number of applications per user
export async function getAvgApplicationsPerUser() {
  const { data, error } = await supabase
    .from('applications')
    .select('user_id');
  
  if (error) throw error;
  
  const userApps = data?.reduce((acc: any, app) => {
    acc[app.user_id] = (acc[app.user_id] || 0) + 1;
    return acc;
  }, {});
  
  const userCount = Object.keys(userApps || {}).length;
  const totalApps = data?.length || 0;
  
  return {
    total_applications: totalApps,
    unique_users: userCount,
    avg_per_user: userCount > 0 ? totalApps / userCount : 0
  };
}

// Track job event (view, apply_click, save)
export async function trackJobEvent(
  internshipId: string,
  eventType: 'view' | 'apply_click' | 'save'
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('job_events')
    .insert({
      user_id: user.id,
      internship_id: internshipId,
      event_type: eventType
    })
    .select()
    .single();
  
  if (error) console.error('Error tracking event:', error);
  return data;
}

// Submit feedback
export async function submitFeedback(
  internshipId: string | null,
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'bug' | 'feature_request',
  text?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      internship_id: internshipId,
      feedback_type: feedbackType,
      text: text || null
    })
    .select()
    .single();
  
  if (error) console.error('Error submitting feedback:', error);
  return data;
}
