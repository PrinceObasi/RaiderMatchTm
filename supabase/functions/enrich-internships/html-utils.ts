/**
 * HTML processing and cleaning utilities for job description extraction
 */

/**
 * Remove HTML tags and get plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|section|article|header|footer|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Clean HTML for better parsing
 */
export function cleanHtml(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<[^>]+style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove navigation and footer elements
 */
export function removeNonContent(html: string): string {
  const removePatterns = [
    /<nav[^>]*>[\s\S]*?<\/nav>/gi,
    /<header[^>]*>[\s\S]*?<\/header>/gi,
    /<footer[^>]*>[\s\S]*?<\/footer>/gi,
    /<aside[^>]*>[\s\S]*?<\/aside>/gi,
    /class\s*=\s*["'][^"']*\b(nav|navigation|header|footer|sidebar|menu|breadcrumb|cookie|gdpr|banner)\b[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,
  ];
  
  let cleaned = html;
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned;
}

/**
 * Find the main content area in HTML
 */
export function findMainContent(html: string): string {
  const mainSelectors = [
    '<main[^>]*>([\\s\\S]*?)</main>',
    '<article[^>]*>([\\s\\S]*?)</article>',
    'role\\s*=\\s*["\'](main|article)["\'][^>]*>([\\s\\S]*?)</',
    'class\\s*=\\s*["\'"][^"\']*job-description[^"\']*["\'"][^>]*>([\\s\\S]*?)</',
    'class\\s*=\\s*["\'"][^"\']*description[^"\']*["\'"][^>]*>([\\s\\S]*?)</',
    'id\\s*=\\s*["\'"]job-description["\'"][^>]*>([\\s\\S]*?)</',
    'id\\s*=\\s*["\'"]description["\'"][^>]*>([\\s\\S]*?)</',
  ];
  
  for (const selector of mainSelectors) {
    const pattern = new RegExp(selector, 'i');
    const match = html.match(pattern);
    if (match) {
      const content = match[match.length - 1];
      if (content && content.length > 200) {
        return content;
      }
    }
  }
  
  const blocks = html.split(/<\/(div|section|article)>/i);
  let largest = '';
  let largestSize = 0;
  
  for (const block of blocks) {
    const text = stripHtml(block);
    if (text.length > largestSize && text.length > 200) {
      largest = block;
      largestSize = text.length;
    }
  }
  
  return largest;
}

/**
 * Extract structured lists (requirements, qualifications, etc.)
 */
export function extractLists(html: string): string[][] {
  const lists: string[][] = [];
  const listPattern = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  const listMatches = html.matchAll(listPattern);
  
  for (const listMatch of listMatches) {
    const listHtml = listMatch[2];
    const items: string[] = [];
    const itemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const itemMatches = listHtml.matchAll(itemPattern);
    
    for (const itemMatch of itemMatches) {
      const text = stripHtml(itemMatch[1]).trim();
      if (text && text.length > 10 && text.length < 300) {
        items.push(text);
      }
    }
    
    if (items.length > 0) {
      lists.push(items);
    }
  }
  
  return lists;
}

/**
 * Extract requirements from text by looking for section headers
 */
export function extractRequirementsFromText(text: string): string[] {
  const requirements: string[] = [];
  const lines = text.split('\n');
  
  let inRequirements = false;
  const reqHeaders = /requirements|qualifications|what you'll do|responsibilities|must have|required|you have|your background/i;
  const endHeaders = /benefits|compensation|about us|equal opportunity|apply|we offer/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (endHeaders.test(line)) {
      break;
    }
    
    if (reqHeaders.test(line)) {
      inRequirements = true;
      continue;
    }
    
    if (inRequirements && line.length > 15) {
      if (line.match(/^[•\-\*\d\.]/)) {
        const cleaned = line.replace(/^[•\-\*\d\.\)]+\s*/, '').trim();
        if (cleaned.length > 20 && cleaned.length < 250) {
          requirements.push(cleaned);
          if (requirements.length >= 8) break;
        }
      }
    }
  }
  
  return requirements;
}
