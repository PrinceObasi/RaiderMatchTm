import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { limit = 300, force = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('internships')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!force) {
      query = query.or('description_text.is.null,tech_stack.eq.{},work_mode.is.null');
    }

    const { data: internships, error } = await query;

    if (error) throw error;

    console.log(`Processing ${internships.length} internships`);

    let updated = 0;
    let skipped = 0;
    const sample = [];

    for (const internship of internships) {
      try {
        // Skip if all fields are populated and not forcing
        if (!force && internship.description_text && internship.tech_stack?.length > 0 && internship.work_mode) {
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

        // Generate description_text
        const descriptionText = force || !internship.description_text
          ? generateDescription(plainText, internship)
          : internship.description_text;

        // Extract tech_stack
        const techStack = force || !internship.tech_stack?.length
          ? extractTechStack(plainText)
          : internship.tech_stack;

        // Detect work_mode
        const workMode = force || !internship.work_mode
          ? detectWorkMode(plainText)
          : internship.work_mode;

        // Update database
        const { error: updateError } = await supabase
          .from('internships')
          .update({
            description_text: descriptionText,
            tech_stack: techStack,
            work_mode: workMode
          })
          .eq('id', internship.id);

        if (updateError) {
          console.error(`Update error for ${internship.company}:`, updateError.message);
          skipped++;
        } else {
          updated++;
          if (sample.length < 5) {
            sample.push({
              id: internship.id,
              company: internship.company,
              role: internship.role_title,
              description_text: descriptionText,
              tech_stack: techStack,
              work_mode: workMode
            });
          }
        }
      } catch (rowError) {
        console.error(`Error processing ${internship.company}:`, rowError.message);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: internships.length,
        updated,
        skipped,
        sample
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enrich display error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
