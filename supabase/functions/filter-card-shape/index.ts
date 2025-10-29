import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical tech tags
const CANONICAL_TAGS = new Set([
  'python', 'java', 'c', 'c++', 'c#', 'go', 'rust', 'javascript', 'typescript',
  'sql', 'postgresql', 'mysql', 'mongodb', 'react', 'node.js', 'spring', 'dotnet',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'linux', 'bash', 'git',
  'spark', 'hadoop', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy',
  'airflow', 'snowflake', 'redis', 'elasticsearch', 'kafka', 'jenkins', 'terraform',
  'graphql', 'vue', 'angular', 'django', 'flask', 'fastapi', 'express', 'nextjs',
  'tailwind', 'sass', 'webpack', 'vite', 'jest', 'cypress', 'selenium'
]);

const BUILD_VERBS = /\b(build|design|code|develop|test|analy[sz]e|prototype|deploy|present|optimi[sz]e|collaborate|visuali[sz]e|support|maintain|create|implement|deliver|work|contribute|participate|assist|gain|learn)\b/i;
const FLUFF_TERMS = /(fast-paced|world-class|dynamic environment|rockstar|ninja)/i;

interface InternshipRecord {
  id: string;
  location: string | null;
  summary_text: string | null;
  tech_stack: string[] | null;
  company: string;
  role_title: string;
}

interface ValidationResult {
  pass: boolean;
  reasons: string[];
}

function validateLocation(location: string | null): ValidationResult {
  if (!location) {
    return { pass: false, reasons: ['No location'] };
  }

  const loc = location.trim();

  // Reject if contains multiple location indicators
  const multiLocationPattern = /[;/|]|( and )|( or )|,.*,.*,/i;
  if (multiLocationPattern.test(loc)) {
    return { pass: false, reasons: ['Multiple locations (separators)'] };
  }

  // Count commas - if more than 1, likely multiple locations
  const commaCount = (loc.match(/,/g) || []).length;
  if (commaCount > 1) {
    return { pass: false, reasons: ['Multiple locations (comma count)'] };
  }

  // Check for multiple city patterns (e.g., "Austin" followed by another capital city name)
  const cityPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
  const cityMatches = loc.match(cityPattern);
  if (cityMatches && cityMatches.length > 2) {
    // More than 2 capitalized words likely means multiple cities
    return { pass: false, reasons: ['Multiple locations (multiple cities)'] };
  }

  // Must match simple pattern: "City, ST" or "City Name, ST" or just "Remote"
  const validPattern = /^(Remote|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})(\s*[·•]\s*(remote|hybrid|in-person))?$/i;
  if (!validPattern.test(loc)) {
    return { pass: false, reasons: ['Invalid location format'] };
  }

  return { pass: true, reasons: [] };
}

function validateSummary(summary: string | null): ValidationResult {
  const reasons: string[] = [];

  if (!summary) {
    return { pass: false, reasons: ['No summary'] };
  }

  const trimmed = summary.trim();

  // Reject if too short (less than 100 chars is likely too brief)
  if (trimmed.length < 100) {
    reasons.push(`Too short (${trimmed.length} chars)`);
  }

  // Length check (max 320 chars)
  if (trimmed.length > 320) {
    reasons.push(`Too long (${trimmed.length} chars)`);
  }

  // Sentence count (must be 2-3 sentences)
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 2) {
    reasons.push(`Too few sentences (${sentences.length}, need 2-3)`);
  }
  if (sentences.length > 3) {
    reasons.push(`Too many sentences (${sentences.length}, need 2-3)`);
  }

  // Must have BUILD/LEARN/DO verbs
  if (!BUILD_VERBS.test(trimmed)) {
    reasons.push('Missing action verbs');
  }

  // Must not have fluff terms
  if (FLUFF_TERMS.test(trimmed)) {
    reasons.push('Contains fluff terms');
  }

  return { pass: reasons.length === 0, reasons };
}

function validateTechStack(techStack: string[] | null): ValidationResult {
  const reasons: string[] = [];

  if (!techStack || techStack.length === 0) {
    return { pass: false, reasons: ['No tech stack'] };
  }

  // Length check (6-10)
  if (techStack.length < 6 || techStack.length > 10) {
    reasons.push(`Wrong count (${techStack.length}, need 6-10)`);
  }

  // All must be lowercase
  const hasUppercase = techStack.some(tag => tag !== tag.toLowerCase());
  if (hasUppercase) {
    reasons.push('Contains uppercase tags');
  }

  // All must be canonical
  const nonCanonical = techStack.filter(tag => !CANONICAL_TAGS.has(tag.toLowerCase()));
  if (nonCanonical.length > 0) {
    reasons.push(`Non-canonical tags: ${nonCanonical.join(', ')}`);
  }

  return { pass: reasons.length === 0, reasons };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const BATCH_SIZE = 500;
    let offset = 0;
    let totalProcessed = 0;
    let totalKept = 0;
    let totalArchived = 0;
    const archiveReasons: Record<string, number> = {};

    console.log('Starting card-shape filter...');

    while (true) {
      // Fetch batch of active internships
      const { data: internships, error } = await supabase
        .from('internships')
        .select('id, location, summary_text, tech_stack, company, role_title')
        .eq('is_active', true)
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        throw error;
      }

      if (!internships || internships.length === 0) {
        break;
      }

      console.log(`Processing batch: ${offset} to ${offset + internships.length}`);

      // Validate each internship
      const updates: Array<{ id: string; archive: boolean; reason: string }> = [];

      for (const internship of internships as InternshipRecord[]) {
        const locationCheck = validateLocation(internship.location);
        const summaryCheck = validateSummary(internship.summary_text);
        const techStackCheck = validateTechStack(internship.tech_stack);

        const allReasons = [
          ...locationCheck.reasons,
          ...summaryCheck.reasons,
          ...techStackCheck.reasons
        ];

        if (locationCheck.pass && summaryCheck.pass && techStackCheck.pass) {
          totalKept++;
        } else {
          const reason = allReasons.join('; ');
          updates.push({ id: internship.id, archive: true, reason });
          
          // Track reasons
          for (const r of allReasons) {
            archiveReasons[r] = (archiveReasons[r] || 0) + 1;
          }
          
          totalArchived++;
        }
      }

      // Archive the ones that failed
      for (const update of updates) {
        await supabase
          .from('internships')
          .update({
            is_active: false,
            archived_at: new Date().toISOString(),
            needs_review: true,
            review_reason: ['card_shape_filter'],
            validation_message: update.reason
          })
          .eq('id', update.id);
      }

      totalProcessed += internships.length;
      offset += BATCH_SIZE;

      console.log(`Batch complete. Kept: ${totalKept}, Archived: ${totalArchived}`);

      // If we got less than batch size, we're done
      if (internships.length < BATCH_SIZE) {
        break;
      }
    }

    const result = {
      success: true,
      totalProcessed,
      totalKept,
      totalArchived,
      archiveReasons,
      timestamp: new Date().toISOString()
    };

    console.log('Card-shape filter complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in card-shape filter:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
