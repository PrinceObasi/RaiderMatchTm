const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Tech dictionary for extraction
const TECH_KEYWORDS = [
  'Python', 'Java', 'C++', 'C#', 'JavaScript', 'TypeScript', 'React', 'Node.js',
  'Vue', 'Angular', 'Django', 'Flask', 'Spring', 'SQL', 'PostgreSQL', 'MongoDB',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'Linux', 'Terraform',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Figma', 'Swift', 'Kotlin', 'Go', 'Rust'
];

function extractTechStack(text) {
  const found = new Set();
  const lowerText = text.toLowerCase();
  
  for (const tech of TECH_KEYWORDS) {
    if (lowerText.includes(tech.toLowerCase())) {
      found.add(tech);
    }
  }
  
  return Array.from(found);
}

function extractFromMeta($) {
  const ogDesc = $('meta[property="og:description"]').attr('content');
  if (ogDesc && ogDesc.length > 80) return ogDesc;
  
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc && metaDesc.length > 80) return metaDesc;
  
  const twitterDesc = $('meta[name="twitter:description"]').attr('content');
  if (twitterDesc && twitterDesc.length > 80) return twitterDesc;
  
  return null;
}

function extractATSContent($) {
  // Try ATS-specific selectors
  const selectors = [
    '[data-automation-id="jobPostingDescription"]', // Workday
    '#content', // Greenhouse
    '.job-description',
    '.opening',
    '.job-section', // SmartRecruiters
    '#iCIMS_JobContent', // iCIMS
    '[data-cy="job-description"]', // Ashby
    'main',
    'article'
  ];
  
  for (const sel of selectors) {
    const elem = $(sel);
    if (elem.length && elem.text().trim().length > 100) {
      return elem.text().trim();
    }
  }
  
  return null;
}

function pickBestParagraphs(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30 && s.trim().length < 300);
  if (sentences.length > 0) {
    const firstTwo = sentences.slice(0, 2).join('. ').trim();
    if (firstTwo.length > 50) return firstTwo + '.';
  }
  
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50 && p.trim().length < 500);
  if (paragraphs.length > 0) {
    return paragraphs[0].trim().replace(/\s+/g, ' ');
  }
  
  return null;
}

function clampShort(text, max) {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + '...';
}

app.post('/api/extract-job', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Try meta tags first
    let shortDescription = extractFromMeta($);
    
    // If meta tags don't work, try ATS content
    if (!shortDescription || shortDescription.length < 80) {
      const atsContent = extractATSContent($);
      if (atsContent) {
        const para = pickBestParagraphs(atsContent);
        if (para) {
          shortDescription = clampShort(para, 450);
        }
      }
    }
    
    // Extract tech stack
    const fullText = $('body').text();
    const techStack = extractTechStack(fullText);
    
    res.json({
      shortDescription: shortDescription || null,
      techStack: techStack.length > 0 ? techStack : []
    });
    
  } catch (error) {
    console.error('Extraction error:', error.message);
    res.status(500).json({ 
      error: 'Failed to extract job data',
      message: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Job extractor service running on port ${PORT}`);
});
