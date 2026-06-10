type Factors = {
  skillOverlap: number;        // 0-1
  gpa: number;                 // 0-1   (normalize 2.0-4.0 → 0-1)
  prevIntern: boolean;
  projectDepth: number;        // 0-1
};

export function computeHireScore(f: Factors) {
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