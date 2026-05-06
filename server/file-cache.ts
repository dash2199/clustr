import fs from 'fs';
import path from 'path';
import { getCachedFile, upsertFileCache, bumpCacheHitCount, deleteCachedFile, getCacheStats, clearFileCache } from './db.js';

const MAX_FILE_SIZE = 512 * 1024; // 512 KB — skip caching huge files

export interface CacheResult {
  content: string;
  lineCount: number;
  cached: boolean;
  filePath: string;
  sizeBytes: number;
}

/**
 * Read a file, returning cached content if the file hasn't changed (same mtime + size).
 * Automatically refreshes the cache on mtime/size mismatch.
 */
export function readFileCached(filePath: string, offset?: number, limit?: number): CacheResult {
  const resolved = path.resolve(filePath);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error(`File not found: ${resolved}`);
  }

  if (!stat.isFile()) {
    throw new Error(`Not a file: ${resolved}`);
  }

  if (stat.size > MAX_FILE_SIZE) {
    const content = fs.readFileSync(resolved, 'utf-8');
    return sliceContent(content, resolved, stat.size, false, offset, limit);
  }

  const mtimeMs = Math.floor(stat.mtimeMs);
  const cached = getCachedFile(resolved);

  if (cached && cached.mtime_ms === mtimeMs && cached.size_bytes === stat.size) {
    bumpCacheHitCount(resolved);
    return sliceContent(cached.content, resolved, stat.size, true, offset, limit);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  upsertFileCache(resolved, content, mtimeMs, stat.size);
  return sliceContent(content, resolved, stat.size, false, offset, limit);
}

function sliceContent(
  content: string,
  filePath: string,
  sizeBytes: number,
  cached: boolean,
  offset?: number,
  limit?: number,
): CacheResult {
  const lines = content.split('\n');
  const totalLines = lines.length;

  if (offset !== undefined || limit !== undefined) {
    const start = Math.max(0, (offset ?? 1) - 1);
    const end = limit !== undefined ? start + limit : totalLines;
    const sliced = lines.slice(start, end);
    return {
      content: sliced.map((l, i) => `${start + i + 1}|${l}`).join('\n'),
      lineCount: totalLines,
      cached,
      filePath,
      sizeBytes,
    };
  }

  return {
    content: lines.map((l, i) => `${i + 1}|${l}`).join('\n'),
    lineCount: totalLines,
    cached,
    filePath,
    sizeBytes,
  };
}

export function invalidateFile(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const cached = getCachedFile(resolved);
  if (!cached) return false;
  deleteCachedFile(resolved);
  return true;
}

export function getFileCacheStats() {
  return getCacheStats();
}

export function clearFileCacheAll() {
  clearFileCache();
}
