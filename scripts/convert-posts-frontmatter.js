#!/usr/bin/env node

import fs from 'fs/promises';
import { glob } from 'glob';

// Check if gray-matter is installed
let matter;
try {
  matter = (await import('gray-matter')).default;
} catch (error) {
  console.error('\x1b[31mError: gray-matter package not found.\x1b[0m');
  console.error('Please install it by running:');
  console.error('  npm install --save-dev gray-matter');
  process.exit(1);
}

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

async function convertPost(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);
  
  // Create new frontmatter based on schema
  const newFrontmatter = {
    title: frontmatter.title || 'Untitled',
    description: frontmatter.description || undefined,
    location: frontmatter.location || undefined,
    createdAt: parseDate(frontmatter.date || frontmatter.createdAt),
    updatedAt: parseDate(frontmatter.updatedAt || frontmatter.date || frontmatter.createdAt),
    publishedAt: frontmatter.draft === false ? parseDate(frontmatter.date || frontmatter.publishedAt) : undefined,
    tags: normalizeTags(frontmatter.tags, frontmatter.categories),
    image: frontmatter.image || undefined,
    draft: frontmatter.draft !== false, // Default to true unless explicitly false
    aliases: frontmatter.aliases || undefined,
    githubUrl: frontmatter.github_url || frontmatter.githubUrl || undefined,
    series: frontmatter.series || undefined
  };
  
  // Remove undefined values
  Object.keys(newFrontmatter).forEach(key => {
    if (newFrontmatter[key] === undefined) {
      delete newFrontmatter[key];
    }
  });
  
  // Create new file content
  const newContent = matter.stringify(body, newFrontmatter);
  
  return { filePath, oldFrontmatter: frontmatter, newFrontmatter, newContent };
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  
  // Remove quotes if present
  dateStr = dateStr.replace(/['"]/g, '');
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`${colors.yellow}Warning: Invalid date "${dateStr}"${colors.reset}`);
    return new Date();
  }
  
  return date;
}

function normalizeTags(tags, categories) {
  const allTags = new Set();
  
  // Add tags if they exist
  if (Array.isArray(tags)) {
    tags.forEach(tag => allTags.add(tag));
  } else if (typeof tags === 'string') {
    allTags.add(tags);
  }
  
  // Add category as a tag if it exists
  if (categories) {
    if (Array.isArray(categories)) {
      categories.forEach(cat => allTags.add(cat));
    } else if (typeof categories === 'string') {
      allTags.add(categories);
    }
  }
  
  return allTags.size > 0 ? Array.from(allTags) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  console.log(`${colors.green}Post Frontmatter Converter${colors.reset}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log('');
  
  // Find all MD and MDX files in posts directory
  const files = await glob('src/content/posts/**/*.{md,mdx}');
  console.log(`Found ${files.length} posts to process\n`);
  
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const result = await convertPost(file);
      
      // Check if conversion is needed
      const hasChanges = JSON.stringify(result.oldFrontmatter) !== JSON.stringify(result.newFrontmatter);
      
      if (!hasChanges) {
        if (verbose) {
          console.log(`${colors.yellow}SKIP${colors.reset} ${file} (no changes needed)`);
        }
        skipped++;
        continue;
      }
      
      if (verbose || !dryRun) {
        console.log(`${colors.green}CONVERT${colors.reset} ${file}`);
        
        if (verbose) {
          console.log('  Old frontmatter:');
          console.log('    ' + JSON.stringify(result.oldFrontmatter, null, 2).split('\n').join('\n    '));
          console.log('  New frontmatter:');
          console.log('    ' + JSON.stringify(result.newFrontmatter, null, 2).split('\n').join('\n    '));
        }
      }
      
      if (!dryRun) {
        await fs.writeFile(file, result.newContent);
      }
      
      converted++;
    } catch (error) {
      console.error(`${colors.red}ERROR${colors.reset} ${file}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\nSummary:');
  console.log(`  Converted: ${converted}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  
  if (dryRun) {
    console.log(`\n${colors.yellow}This was a dry run. No files were modified.${colors.reset}`);
    console.log('Run without --dry-run to apply changes.');
  }
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});