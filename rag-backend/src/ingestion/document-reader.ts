import fs from 'fs/promises';
import path from 'path';
import fm from 'front-matter';
import { env, logger } from '../config/index.js';

export interface DocFile {
  filePath: string;          // Relative path from docs root
  absolutePath: string;      // Full filesystem path
  content: string;           // Raw markdown content (without frontmatter)
  title: string;             // From frontmatter or first heading
  description?: string;      // From frontmatter
  category: string;          // Top-level directory (e.g., 'features', 'providers')
  urlPath: string;           // URL path for the doc
  lastModified: Date;
}

interface Frontmatter {
  title?: string;
  description?: string;
  sidebar_label?: string;
  sidebar_position?: number;
  [key: string]: unknown;
}

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /_/,           // Underscore prefixed files
  /\.DS_Store/,
];

function shouldIgnore(filePath: string): boolean {
  return IGNORED_PATTERNS.some(pattern => pattern.test(filePath));
}

function extractTitleFromContent(content: string): string {
  // Try to find first h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return 'Untitled';
}

function getCategory(relativePath: string): string {
  const parts = relativePath.split(path.sep);
  if (parts.length > 1) {
    return parts[0];
  }
  return 'root';
}

function getUrlPath(relativePath: string): string {
  // Convert file path to URL path
  // docs/features/checkpoints.md -> /features/checkpoints
  // docs/index.mdx -> /
  let urlPath = relativePath
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '')
    .replace(/\/index$/, '');
  
  if (!urlPath.startsWith('/')) {
    urlPath = '/' + urlPath;
  }
  
  return urlPath;
}

export async function readDocFile(absolutePath: string, relativePath: string): Promise<DocFile | null> {
  try {
    const raw = await fs.readFile(absolutePath, 'utf-8');
    const stats = await fs.stat(absolutePath);
    
    // Parse frontmatter
    const { attributes, body } = fm<Frontmatter>(raw);
    
    const title = attributes.title || 
                  attributes.sidebar_label || 
                  extractTitleFromContent(body);
    
    return {
      filePath: relativePath,
      absolutePath,
      content: body,
      title,
      description: attributes.description,
      category: getCategory(relativePath),
      urlPath: getUrlPath(relativePath),
      lastModified: stats.mtime,
    };
  } catch (error) {
    logger.error({ error, path: absolutePath }, 'Failed to read doc file');
    return null;
  }
}

export async function* walkDocs(docsDir: string): AsyncGenerator<{ absolutePath: string; relativePath: string }> {
  async function* walk(dir: string, baseDir: string): AsyncGenerator<{ absolutePath: string; relativePath: string }> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, absolutePath);
      
      if (shouldIgnore(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        yield* walk(absolutePath, baseDir);
      } else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
        yield { absolutePath, relativePath };
      }
    }
  }
  
  yield* walk(docsDir, docsDir);
}

export async function readAllDocs(): Promise<DocFile[]> {
  const docsPath = path.resolve(env.DOCS_ROOT, env.DOCS_CONTENT_PATH);
  logger.info({ docsPath }, 'Reading docs from directory');
  
  const docs: DocFile[] = [];
  
  for await (const { absolutePath, relativePath } of walkDocs(docsPath)) {
    const doc = await readDocFile(absolutePath, relativePath);
    if (doc) {
      docs.push(doc);
    }
  }
  
  logger.info({ count: docs.length }, 'Read all doc files');
  return docs;
}
