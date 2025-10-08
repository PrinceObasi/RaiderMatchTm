import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  limit?: number;
  force?: boolean;
  ids?: string[];
};

const ALLOWED_ATS_HOSTS = [
  'greenhouse.io', 'boards.greenhouse.io', 'lever.co', 'myworkdayjobs.com',
  'icims.com', 'smartrecruiters.com', 'jobvite.com', 'oraclecloud.com',
  'successfactors.com', 'eightfold.ai'
];

const TECH_DICTIONARY = [
  'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'JavaScript', 'TypeScript',
  'React', 'Vue', 'Angular', 'Node', 'Express', 'Next.js', 'Django', 'Flask', 'Spring', '.NET', '.NET Core',
  'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Kafka',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Bash', 'Git', 'Terraform', 'Ansible',
  'Spark', 'Hadoop', 'Airflow', 'Pandas', 'NumPy',
  'TensorFlow', 'PyTorch', 'scikit-learn', 'MATLAB',
  'Swift', 'Kotlin', 'Android', 'iOS', 'Figma',
  'MATLAB/Simulink', 'Verilog', 'VHDL', 'FPGA', 'ROS', 'CAN', 'CUDA'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { limit = 50, force = false, ids = [] } = (await req.json().catch(() => ({}))) as Payload;
    
    console.log('ENRICH_START', { limit, force, ids_len: ids.length, timestamp: new Date().toISOString() });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${supabaseKey}` } },
      db: { schema: 'public' }
    });

    // Build query - align with RLS-visible rows
    let query = supabase
      .from('internships')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ids.length > 0) {
      // Explicit targeting: allow enriching any specific IDs
      query = query.in('id', ids);
    } else {
      // Always target the *visible* set (RLS-aligned)
      query = query
        .eq('is_active', true)
        .or('is_texas.is.null,is_texas.eq.true');
      
      // Only skip "missing fields" checks when force=true
      if (!force) {
        query = query.or('summary_text.is.null,work_mode.is.null');
      }
    }

    const { data: internships, error, count } = await query;

    if (error) {
      console.error('ENRICH_SELECT_ERROR', { message: error.message, details: error });
      throw error;
    }

    console.log('ENRICH_SELECT', { 
      count, 
      retrieved: internships?.length || 0, 
      force, 
      sample_ids: internships?.slice(0, 3).map(i => i.id) 
    });

    if (!internships || internships.length === 0) {
      console.log('ENRICH_NO_TARGETS', { reason: 'no matching internships' });
      return new Response(
        JSON.stringify({ success: true, scanned: 0, updated: 0, skipped: 0, reason: 'no-targets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let skipped = 0;
    const sample = [];

    for (const internship of internships) {
      console.log('ENRICH_PROCESSING', { id: internship.id, company: internship.company });
      try {
        // Skip if all fields are populated and not forcing
        if (!force && internship.summary_text && internship.tech_stack?.length > 0 && internship.work_mode) {
          skipped++;
          continue;
        }

        let htmlContent = internship.description_html || '';

        // Fetch from direct_link if needed and host is allowed
        if (!htmlContent && internship.direct_link) {
          const url = new URL(internship.direct_link);
          const isAllowedHost = ALLOWED_ATS_HOSTS.some(host => url.hostname.includes(host));

          if (isAllowedHost) {
            console.log(`Fetching ${url.hostname} for ${internship.company}`);
            try {
              const response = await fetch(internship.direct_link, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000)
              });
              
              if (response.ok) {
                const text = await response.text();
                htmlContent = text.slice(0, 60000); // 60KB limit
              }
            } catch (fetchError) {
              console.error(`Fetch error for ${internship.company}:`, fetchError.message);
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
          }
        }

        // Extract plain text
        const plainText = stripHtml(htmlContent);

        // Generate summary_text
        const summaryText = force || !internship.summary_text
          ? generateDescription(plainText, internship)
          : internship.summary_text;

        // Extract tech_stack
        const techStack = force || !internship.tech_stack?.length
          ? extractTechStack(plainText)
          : internship.tech_stack;

        // Detect work_mode
        const workMode = force || !internship.work_mode
          ? detectWorkMode(plainText)
          : internship.work_mode;

        // Ensure description_text is populated (UI fallback)
        const descriptionText = (internship.description_text && internship.description_text.trim().length > 0)
          ? internship.description_text
          : summaryText;

        // Update database
        console.log('ENRICH_UPDATE_ATTEMPT', { 
          id: internship.id, 
          company: internship.company,
          summary_len: summaryText?.length || 0,
          desc_len: descriptionText?.length || 0,
          tech_count: techStack?.length || 0,
          work_mode: workMode
        });

        const { data: updateData, error: updateError } = await supabase
          .from('internships')
          .update({
            summary_text: summaryText,
            description_text: descriptionText,
            tech_stack: techStack,
            work_mode: workMode
          })
          .eq('id', internship.id)
          .select('id, company, summary_text, description_text, tech_stack, work_mode');

        if (updateError) {
          console.error('ENRICH_UPDATE_ERROR', { 
            id: internship.id, 
            company: internship.company, 
            message: updateError.message,
            code: updateError.code,
            details: updateError.details 
          });
          skipped++;
        } else {
          console.log('ENRICH_UPDATE_SUCCESS', { 
            id: internship.id, 
            company: internship.company,
            updated_data: updateData?.[0]
          });
          updated++;
          if (sample.length < 5) {
            sample.push({
              id: internship.id,
              company: internship.company,
              role: internship.role_title,
              summary_text: summaryText,
              tech_stack: techStack,
              work_mode: workMode
            });
          }
        }
      } catch (rowError: any) {
        console.error('ENRICH_ROW_ERROR', { 
          id: internship.id, 
          company: internship.company, 
          message: rowError.message,
          stack: rowError.stack 
        });
        skipped++;
      }
    }

    const duration = Date.now() - startTime;
    console.log('ENRICH_COMPLETE', { 
      scanned: internships.length, 
      updated, 
      skipped, 
      duration_ms: duration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        scanned: internships.length,
        updated,
        skipped,
        sample,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('ENRICH_FATAL_ERROR', { 
      message: error.message, 
      stack: error.stack,
      name: error.name 
    });
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateDescription(text: string, internship: any): string {
  // Find relevant sections
  const sections = ['responsibilities', 'role', 'what you', 'about the role', 'requirements', 'qualifications'];
  const lines = text.split(/[.\n]/).filter(l => l.trim().length > 20);
  
  const relevantLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return sections.some(s => lower.includes(s)) || 
           lower.includes('develop') || 
           lower.includes('design') ||
           lower.includes('build') ||
           lower.includes('work with') ||
           lower.includes('collaborate');
  });

  let description = relevantLines.slice(0, 3).join('. ').trim();

  // Fallback: use template
  if (description.length < 50) {
    const role = internship.role_title || 'intern';
    const company = internship.company || '';
    const location = internship.location || '';
    description = `Work as a ${role} at ${company} in ${location}, contributing to software development and engineering projects.`;
  }

  // Limit to 260 chars
  if (description.length > 260) {
    description = description.slice(0, 257) + '...';
  }

  return description;
}

function extractTechStack(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const tech of TECH_DICTIONARY) {
    const lowerTech = tech.toLowerCase();
    // Match whole word boundaries
    const regex = new RegExp(`\\b${lowerTech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.add(tech);
      if (found.size >= 6) break;
    }
  }

  return Array.from(found);
}

function detectWorkMode(text: string): string | null {
  const lower = text.toLowerCase();
  
  if (/\bremote\b/.test(lower)) return 'remote';
  if (/\bhybrid\b/.test(lower)) return 'hybrid';
  if (/\b(on[-\s]?site|in[-\s]?person|in person|on site)\b/.test(lower)) return 'in-person';
  
  return null;
}
