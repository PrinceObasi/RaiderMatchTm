import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Internship ID required' }, { status: 400, headers: corsHeaders });
    }

    // Get the internship record
    const { data: internship, error: fetchError } = await supabase
      .from('internships')
      .select('application_link')
      .eq('id', id)
      .single();

    if (fetchError || !internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404, headers: corsHeaders });
    }

    if (!internship.application_link) {
      return NextResponse.json({ error: 'No application URL found' }, { status: 400, headers: corsHeaders });
    }

    // Fetch the job page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(internship.application_link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract enrichment data
      const enrichmentData = extractJobData($, html);

      // Update the database
      const { error: updateError } = await supabase
        .from('internships')
        .update({
          jd_raw: html.substring(0, 50000), // Limit raw HTML size
          jd_summary: enrichmentData.summary,
          salary_min: enrichmentData.salary_min,
          salary_max: enrichmentData.salary_max,
          salary_currency: enrichmentData.salary_currency,
          salary_period: enrichmentData.salary_period,
          enrichment_confidence: enrichmentData.confidence,
          enriched_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json({ error: 'Failed to update database' }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({
        ok: true,
        jd_summary: enrichmentData.summary,
        salary_min: enrichmentData.salary_min,
        salary_max: enrichmentData.salary_max,
        salary_period: enrichmentData.salary_period
      }, { headers: corsHeaders });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch job page' }, { status: 502, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

function extractJobData($: cheerio.CheerioAPI, html: string) {
  let summary = '';
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_currency = 'USD';
  let salary_period: string | null = null;
  let confidence = 40;

  try {
    // Extract salary from JSON-LD
    const jsonLdScript = $('script[type="application/ld+json"]').text();
    if (jsonLdScript) {
      try {
        const jsonLd = JSON.parse(jsonLdScript);
        if (jsonLd.baseSalary) {
          const baseSalary = jsonLd.baseSalary;
          if (baseSalary.value) {
            const minValue = baseSalary.value.minValue || baseSalary.value;
            const maxValue = baseSalary.value.maxValue || baseSalary.value;
            salary_min = parseFloat(minValue);
            salary_max = parseFloat(maxValue);
            salary_currency = baseSalary.currency || 'USD';
            salary_period = baseSalary.unitText || 'year';
            confidence = 100;
          }
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }

    // Fallback: Extract salary with regex
    if (!salary_min) {
      const salaryPatterns = [
        // $40-50/hr, $40-$50 per hour
        /\$?\s?(\d{2,3})(?:,?\d{3})?\s*-\s*\$?\s?(\d{2,3})(?:,?\d{3})?\s*(?:per\s)?(hour|hr)/i,
        // $80k-95k, $80K-$95K
        /\$?\s?(\d{2,3})[kK]\s*-\s*\$?\s?(\d{2,3})[kK]/i,
        // $70,000-$90,000
        /\$?\s?(\d{2,3}),?(\d{3})\s*-\s*\$?\s?(\d{2,3}),?(\d{3})/i,
        // Single values: $25/hr, $85k
        /\$?\s?(\d+(?:\.\d{1,2})?)\s*(hour|hr|k|year|yr|annum)/i
      ];

      const text = $.text();
      for (const pattern of salaryPatterns) {
        const match = text.match(pattern);
        if (match) {
          if (pattern.source.includes('kK')) {
            // Handle k format (80k-95k)
            salary_min = parseInt(match[1]) * 1000;
            salary_max = parseInt(match[2]) * 1000;
            salary_period = 'year';
            confidence = 70;
          } else if (match[3] && match[4]) {
            // Handle full numbers with commas
            salary_min = parseInt(match[1] + match[2]);
            salary_max = parseInt(match[3] + match[4]);
            salary_period = 'year';
            confidence = 70;
          } else if (match[2]) {
            // Handle single value with unit
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.includes('hour') || unit.includes('hr')) {
              salary_min = value;
              salary_max = value;
              salary_period = 'hour';
            } else if (unit === 'k') {
              salary_min = value * 1000;
              salary_max = value * 1000;
              salary_period = 'year';
            }
            confidence = 70;
          } else if (match[1] && match[2]) {
            // Handle range
            const unit = match[3]?.toLowerCase();
            salary_min = parseFloat(match[1]);
            salary_max = parseFloat(match[2]);
            if (unit?.includes('hour') || unit?.includes('hr')) {
              salary_period = 'hour';
            } else {
              salary_period = 'year';
            }
            confidence = 70;
          }
          break;
        }
      }
    }

    // Generate summary
    const ogDescription = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="twitter:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content');

    if (ogDescription && ogDescription.length > 50) {
      summary = ogDescription.substring(0, 300);
    } else {
      // Extract from main content areas
      const contentSelectors = ['main', 'article', '.job-description', '.content', '.description'];
      let extractedText = '';
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          extractedText = element.text().replace(/\s+/g, ' ').trim();
          if (extractedText.length > 100) break;
        }
      }

      if (extractedText) {
        // Extract key sentences
        const sentences = extractedText.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const techKeywords = ['python', 'java', 'javascript', 'react', 'node', 'sql', 'aws', 'azure', 'c++', 'c#'];
        
        let techSentence = '';
        let roleSentence = '';
        
        for (const sentence of sentences.slice(0, 10)) {
          const lowerSentence = sentence.toLowerCase();
          if (!techSentence && techKeywords.some(keyword => lowerSentence.includes(keyword))) {
            techSentence = sentence.trim();
          }
          if (!roleSentence && (lowerSentence.includes('responsible') || lowerSentence.includes('develop') || lowerSentence.includes('build'))) {
            roleSentence = sentence.trim();
          }
          if (techSentence && roleSentence) break;
        }

        const summaryParts = [roleSentence, techSentence].filter(Boolean);
        summary = summaryParts.join('. ').substring(0, 300);
      }
    }

    // Fallback to default summary if nothing extracted
    if (!summary || summary.length < 50) {
      summary = 'Software engineering internship opportunity. Apply to learn more about specific requirements and responsibilities.';
    }

  } catch (error) {
    console.error('Data extraction error:', error);
    summary = 'Software engineering internship opportunity. Apply to learn more about specific requirements and responsibilities.';
  }

  return {
    summary: summary.trim(),
    salary_min,
    salary_max,
    salary_currency,
    salary_period,
    confidence
  };
}