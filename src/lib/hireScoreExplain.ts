interface Factors {
  overlap: number;        // 0-1
  gpa: number;            // 0-1
  prevIntern: boolean;
  projectDepth: number;   // 0-1
  missingSkills: string[];
}

export function buildExplanation(f: Factors) {
  const lines: string[] = [];

  // 1. Skills
  if (f.overlap > 0.8) {
    lines.push('Your résumé covers most core skills listed.');
  } else if (f.overlap > 0.5) {
    lines.push('You match some key skills, but could highlight more.');
  } else {
    lines.push('Few required skills appear in your résumé.');
  }

  // 2. Missing-skill tip
  if (f.missingSkills.length) {
    lines.push(
      `Try adding: ${f.missingSkills.slice(0,3).join(', ')}.`
    );
  }

  // 3. GPA
  if (f.gpa >= 0.9) lines.push('Strong GPA boosts your score.');
  else if (f.gpa >= 0.7) lines.push('GPA is solid but not standout.');
  else lines.push('Low GPA lowers your match quality.');

  // 4. Internship history
  lines.push(
    f.prevIntern
      ? 'Prior internship experience is a big plus.'
      : 'No prior internship—companies may prefer proven interns.'
  );

  // 5. Project depth
  if (f.projectDepth >= 0.7)
    lines.push('Your GitHub shows substantial, starred projects—great signal.');
  else if (f.projectDepth >= 0.3)
    lines.push('Some repos detected; adding larger projects would improve visibility.');
  else
    lines.push('Few public GitHub projects found—consider open-sourcing work.');

  return lines;
}