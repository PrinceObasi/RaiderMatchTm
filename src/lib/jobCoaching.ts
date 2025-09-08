interface JobMatch {
  overlap: number;
  missing_skills?: string[];
}

export function toExplanation(job: JobMatch): string[] {
  const lines: string[] = [];
  
  if (job.overlap >= 0.75) {
    lines.push('Your skills overlap strongly with this role.');
  } else if (job.overlap >= 0.4) {
    lines.push('You match some of the core skills.');
  } else {
    lines.push('Few listed skills appear in your résumé.');
  }

  if (job.missing_skills?.length) {
    lines.push(`Boost tip: add or highlight ${job.missing_skills.slice(0, 3).join(', ')}.`);
  }
  
  return lines;
}