import type { ReadinessCategory } from './hireScore';

interface ExplainInput {
  category: ReadinessCategory;
  matchedSkills: string[];
  missingSkills: string[];
  prevIntern: boolean;
  projectDepth: number;   // 0-1
  eligibilityReason?: string;
}

export interface ExplainResult {
  evidence: string;
  actions: [string, string, string];
}

export function buildExplanation(f: ExplainInput): ExplainResult {
  const { category, matchedSkills, missingSkills, prevIntern, projectDepth, eligibilityReason } = f;

  switch (category) {
    case 'strong': {
      const skillsText = matchedSkills.length
        ? `Your résumé shows ${matchedSkills.slice(0, 2).join(' and ')}, which are core requirements.`
        : 'Your résumé covers most required skills.';
      return {
        evidence: skillsText,
        actions: [
          'Tailor your résumé bullet points to mirror exact wording in the job description.',
          prevIntern
            ? 'Reference a specific outcome from your prior internship in your cover letter.'
            : 'Lead with a project that demonstrates end-to-end ownership.',
          'Apply within the next 48 hours — strong-match roles fill quickly.',
        ],
      };
    }

    case 'possible': {
      const gap = missingSkills[0];
      return {
        evidence: matchedSkills.length
          ? `You have ${matchedSkills.slice(0, 2).join(' and ')}, but the role also asks for ${gap ?? 'additional skills'}.`
          : `The role asks for skills not yet visible in your résumé.`,
        actions: [
          gap
            ? `Add a project or coursework section that demonstrates ${gap}.`
            : 'Add a projects section that highlights relevant technical work.',
          'Write a focused cover letter explaining why this role fits your trajectory.',
          projectDepth < 0.3
            ? 'Push at least one complete project to GitHub before applying.'
            : 'Highlight your most relevant project in the first résumé bullet.',
        ],
      };
    }

    case 'stretch': {
      const gaps = missingSkills.slice(0, 2).join(' and ');
      return {
        evidence: `This role requires ${gaps || 'skills not yet in your résumé'}. Apply selectively after preparation.`,
        actions: [
          gaps
            ? `Build a small project using ${missingSkills[0]} and publish it before applying.`
            : 'Work through a hands-on project that directly addresses the role\'s requirements.',
          'Reach out to a TTU alumnus at this company for an informational conversation first.',
          'Apply only if you can speak to at least one relevant project in an interview.',
        ],
      };
    }

    case 'ineligible':
    default: {
      return {
        evidence: eligibilityReason
          ? `Your profile appears to conflict with this requirement: ${eligibilityReason}`
          : 'Your profile appears to conflict with a required qualification for this role.',
        actions: [
          'Check your profile for graduation year, degree, or work authorization that may conflict.',
          'Filter for roles marked "freshman-friendly" or "no prior internship required".',
          'Visit the TTU Career Center for roles that match your current eligibility.',
        ],
      };
    }
  }
}
