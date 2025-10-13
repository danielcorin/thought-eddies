import { execSync } from 'child_process';

/**
 * Get the last commit SHA for a specific file
 * @param filePath - The path to the file relative to the git repository root
 * @returns The short SHA of the last commit that modified the file, or null if not found
 */
export function getLastCommitSha(filePath: string): string | null {
  try {
    const sha = execSync(`git log -1 --format=%h -- "${filePath}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();

    return sha || null;
  } catch (error) {
    console.error(`Error getting commit SHA for ${filePath}:`, error);
    return null;
  }
}

/**
 * Get the GitHub commit URL for a file
 * @param filePath - The path to the file relative to the git repository root
 * @param repoUrl - The base GitHub repository URL (e.g., 'https://github.com/user/repo')
 * @returns The GitHub commit URL, or null if no commit SHA is found
 */
export function getCommitUrl(filePath: string, repoUrl: string): string | null {
  const sha = getLastCommitSha(filePath);
  if (!sha) return null;

  return `${repoUrl}/commit/${sha}`;
}
