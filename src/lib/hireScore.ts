export type ReadinessCategory = 'strong' | 'possible' | 'stretch' | 'ineligible';

export interface ReadinessResult {
  category: ReadinessCategory;
  label: string;
  topStrengths: string[];
  topGap: string | null;
}

/**
 * Maps matched/missing skill evidence to a readiness category.
 * Never exposes a numerical score to the UI.
 */
export function getReadinessCategory(
  matchedSkills: string[],
  missingSkills: string[],
  totalSkills: number,
  ineligible?: boolean,
): ReadinessResult {
  if (ineligible) {
    return {
      category: 'ineligible',
      label: 'Not eligible',
      topStrengths: [],
      topGap: missingSkills[0] ?? null,
    };
  }

  const total = totalSkills || (matchedSkills.length + missingSkills.length) || 1;
  const overlapRatio = matchedSkills.length / total;

  let category: ReadinessCategory;
  let label: string;

  if (overlapRatio >= 0.7 && missingSkills.length <= 1) {
    category = 'strong';
    label = 'Strong match';
  } else if (overlapRatio >= 0.4) {
    category = 'possible';
    label = 'Possible match';
  } else if (overlapRatio > 0) {
    category = 'stretch';
    label = 'Stretch';
  } else {
    category = 'stretch';
    label = 'Stretch';
  }

  return {
    category,
    label,
    topStrengths: matchedSkills.slice(0, 2),
    topGap: missingSkills[0] ?? null,
  };
}

type Factors = {
  skillOverlap: number;        // 0-1
  gpa: number;                 // 0-1   (normalize 2.0-4.0 → 0-1)
  prevIntern: boolean;
  projectDepth: number;        // 0-1
};

// Internal scoring — never displayed to users
function computeHireScore(f: Factors) {
  const score =
    0.40 * f.skillOverlap +
    0.25 * f.gpa +
    0.20 * (f.prevIntern ? 1 : 0) +
    0.15 * f.projectDepth;
  return Math.round(score * 100);
}

export function normalizeGPA(gpa: number): number {
  if (gpa < 2.0) return 0;
  if (gpa > 4.0) return 1;
  return (gpa - 2.0) / 2.0;
}
