import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tech keywords to search for
const TECH_KEYWORDS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Angular', 'Vue',
  'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'CI/CD', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'C++', 'C#', '.NET', 'Spring', 'Django', 'Flask', 'Express', 'GraphQL', 'REST',
  'HTML', 'CSS', 'SASS', 'Tailwind', 'Bootstrap', 'Redux', 'Next.js', 'Gatsby',
  'Swift', 'Kotlin', 'Flutter', 'React Native', 'iOS', 'Android', 'Firebase',
  'Rust', 'Go', 'Ruby', 'Rails', 'PHP', 'Laravel', 'Scala', 'Spark', 'Hadoop',
  'Jenkins', 'GitHub Actions', 'Terraform', 'Ansible', 'Linux', 'Bash', 'PowerShell',
  'R', 'MATLAB', 'Julia', 'SAS', 'SPSS', 'Tableau', 'Power BI', 'Excel', 'VBA'
];

// GPA patterns to search for
const GPA_PATTERNS = [
  /GPA.*?([0-9]\.[0-9]+)/i,
  /([0-9]\.[0-9]+).*?GPA/i,
  /grade point average.*?([0-9]\.[0-9]+)/i,
  /minimum.*?([0-9]\.[0-9]+).*?GPA/i,
  /GPA.*?minimum.*?([0-9]\.[0-9]+)/i
];

// Extract tech stack from text
function extractTechStack(text: string): string[] {
  if (!text) return [];
  
  const foundTech = new Set<string>();
  const lowerText = text.toLowerCase();
  
  TECH_KEYWORDS.forEach(tech => {
    const regex = new RegExp(`\\b${tech.toLowerCase()}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundTech.add(tech);
    }
  });
  
  return Array.from(foundTech);
}

// Extract GPA requirement from text
function extractGPARequirement(text: string): number | null {
  if (!text) return null;
  
  for (const pattern of GPA_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const gpa = parseFloat(match[1]);
      if (gpa >= 0 && gpa <= 4.0) {
        return gpa;
      }
    }
  }
  
  return null;
}

// Generate short description from full text
function generateShortDescription(text: string): string {
  if (!text) return "No description available";
  
  // Clean up the text
  text = text.replace(/\s+/g, ' ').trim();
  
  // Look for key sections
  const patterns = [
    /(?:job description|overview|summary|about the role|position summary)[:\s]+(.*?)(?:responsibilities|requirements|qualifications|what you|who you|skills|experience|education|your role)/is,
    /(?:what you'll do|your responsibilities|key responsibilities)[:\s]+(.*?)(?:what we're looking for|requirements|qualifications|skills|experience|education)/is,
    /(?:the role|the position|the opportunity)[:\s]+(.*?)(?:responsibilities|requirements|qualifications|what you|who you|skills)/is
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let description = match[1].trim();
      
      // Remove bullet points and extra formatting
      description = description.replace(/[•·▪□◦‣⁃]/g, '').replace(/\n/g, ' ');
      
      // Get first 250 characters
      if (description.length > 250) {
        description = description.substring(0, 247) + "...";
      }
      
      return description;
    }
  }
  
  // Fallback: Look for first substantive paragraph
  const paragraphs = text.split(/\n\n+/);
  for (const para of paragraphs) {
    if (para.length > 50 && para.length < 500) {
      return para.length > 250 ? para.substring(0, 247) + "..." : para;
    }
  }
  
  // Last fallback: first 250 characters
  return text.length > 250 ? text.substring(0, 247) + "..." : text;
}

// Parse HTML content
function parseHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Common selectors for job descriptions (extract content between tags)
  const selectors = [
    { pattern: /class="[^"]*(?:description|job-description|jobDescription)[^"]*"[^>]*>([\s\S]*?)<\//i },
    { pattern: /class="[^"]*(?:content|posting-content|job-content)[^"]*"[^>]*>([\s\S]*?)<\//i },
    { pattern: /id="[^"]*(?:jobDescriptionText|job-details|content)[^"]*"[^>]*>([\s\S]*?)<\//i },
  ];
  
  for (const { pattern } of selectors) {
    const match = html.match(pattern);
    if (match && match[1] && match[1].length > 100) {
      text = match[1];
      break;
    }
  }
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Parse job posting from URL
async function parseJobPosting(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const jobText = parseHTML(html);
    
    return {
      shortDescription: generateShortDescription(jobText),
      techStack: extractTechStack(jobText),
      gpaRequirement: extractGPARequirement(jobText),
      fullText: jobText.substring(0, 5000)
    };
    
  } catch (error) {
    console.error(`Error parsing ${url}:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, urls, internshipId } = await req.json();
    
    // Single URL extraction
    if (url) {
      const jobData = await parseJobPosting(url);
      
      // If internshipId provided, update the database
      if (internshipId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        await supabase
          .from("internships")
          .update({
            jd_summary: jobData.shortDescription,
            tech_stack: jobData.techStack,
            gpa_requirement: jobData.gpaRequirement,
            jd_raw: jobData.fullText,
            enriched_at: new Date().toISOString()
          })
          .eq("id", internshipId);
      }
      
      return new Response(JSON.stringify(jobData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Batch URL extraction
    if (urls && Array.isArray(urls)) {
      const results = await Promise.allSettled(
        urls.map((url: string) => parseJobPosting(url))
      );
      
      const jobData = results.map((result, index) => ({
        url: urls[index],
        ...(result.status === 'fulfilled' 
          ? result.value 
          : { error: (result.reason as Error).message })
      }));
      
      return new Response(JSON.stringify(jobData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(
      JSON.stringify({ error: "URL or URLs array is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
