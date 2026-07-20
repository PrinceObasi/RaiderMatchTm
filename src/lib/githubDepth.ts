function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numericField(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function fetchProjectDepth(user: string): Promise<number> {
  if (!user) return 0;
  
  try {
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?per_page=100&sort=updated`,
      {
        // Note: No GitHub PAT needed for public API - rate limited but sufficient for this use case
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HireScore-App'
        }
      }
    );
    
    if (!res.ok) return 0;
    
    const repos: unknown = await res.json();
    if (!Array.isArray(repos) || !repos.length) return 0;

    let stars = 0, forks = 0, big = 0;
    repos.forEach((repo: unknown) => {
      if (!isRecord(repo)) return;

      stars += numericField(repo, 'stargazers_count');
      forks += numericField(repo, 'forks_count');
      if (numericField(repo, 'size') > 100) big++; // size in KB
    });

    const score =
      Math.min((stars + forks) / 50, 0.7) +   // community weight
      Math.min(big / 10, 0.3);                // depth weight
    return Math.min(score, 1);                // clamp 0-1
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return 0;
  }
}
