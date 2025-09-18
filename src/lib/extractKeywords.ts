// Common technical skills and technologies for keyword extraction
const TECH_KEYWORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'golang', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'dart', 'scala',
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'gatsby', 'express', 'nodejs', 'django', 'flask', 'spring', 'laravel', 'rails',
  'html', 'css', 'sass', 'scss', 'less', 'tailwind', 'bootstrap', 'material-ui', 'chakra', 'styled-components',
  'mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'cassandra', 'dynamodb', 'firebase', 'supabase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github', 'bitbucket', 'terraform', 'ansible',
  'git', 'npm', 'yarn', 'webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier', 'jest', 'cypress', 'playwright',
  'graphql', 'rest', 'api', 'microservices', 'websockets', 'oauth', 'jwt', 'authentication', 'authorization',
  'machine-learning', 'ai', 'data-science', 'analytics', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
  'mobile', 'ios', 'android', 'flutter', 'react-native', 'xamarin', 'cordova', 'phonegap',
  'testing', 'tdd', 'bdd', 'unit-testing', 'integration-testing', 'e2e-testing', 'performance-testing',
  'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'deployment', 'monitoring', 'logging', 'debugging',
  'ui/ux', 'design', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'prototyping', 'wireframing',
  'blockchain', 'cryptocurrency', 'web3', 'ethereum', 'smart-contracts', 'solidity',
  'security', 'cybersecurity', 'encryption', 'https', 'ssl', 'penetration-testing', 'vulnerability-assessment'
]);

export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Clean and normalize the text
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s\+\#\.]/g, ' ') // Keep word chars, spaces, +, #, .
    .replace(/\s+/g, ' ')
    .trim();

  // Split into tokens
  const tokens = normalized
    .split(' ')
    .filter(token => token.length >= 2 && token.length <= 30)
    .map(token => {
      // Handle special cases
      if (token === 'c++') return 'c++';
      if (token === 'c#') return 'c#';
      if (token === 'node.js' || token === 'nodejs') return 'node.js';
      if (token === 'next.js' || token === 'nextjs') return 'next.js';
      if (token === 'vue.js' || token === 'vuejs') return 'vue.js';
      if (token === 'react.js' || token === 'reactjs') return 'react';
      if (token === 'angular.js' || token === 'angularjs') return 'angular.js';
      return token;
    });

  // Filter for known tech keywords and common variations
  const keywords = tokens.filter(token => {
    // Direct match
    if (TECH_KEYWORDS.has(token)) return true;
    
    // Check for common patterns
    if (token.endsWith('js') && token.length > 2) return true; // e.g., 'vuejs'
    if (token.startsWith('react') || token.startsWith('vue') || token.startsWith('angular')) return true;
    if (token.includes('sql') || token.includes('db')) return true;
    if (token.includes('api') || token.includes('rest') || token.includes('graphql')) return true;
    if (token.includes('test') || token.includes('debug')) return true;
    
    return false;
  });

  // Remove duplicates and return sorted
  return [...new Set(keywords)].sort();
}

export function extractKeywordsFromJobDescription(description: string, techStack: string[] = []): string[] {
  // Combine description keywords with tech stack
  const descriptionKeywords = extractKeywords(description);
  const stackKeywords = techStack.map(tech => tech.toLowerCase().trim()).filter(Boolean);
  
  // Merge and deduplicate
  const allKeywords = [...new Set([...descriptionKeywords, ...stackKeywords])];
  
  return allKeywords.sort();
}