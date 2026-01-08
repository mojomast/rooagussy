#!/usr/bin/env node
/**
 * CLI script for document ingestion
 * Usage:
 *   pnpm run ingest        - Incremental ingest (only changed files)
 *   pnpm run ingest:full   - Full rebuild (drops and recreates collection)
 */

import { ingestIncremental, ingestFull } from '../ingestion/index.js';
import { logger } from '../config/index.js';

const args = process.argv.slice(2);
const isFullRebuild = args.includes('--full') || args.includes('-f');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           Roo Code Docs - RAG Ingestion                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${isFullRebuild ? 'FULL REBUILD' : 'INCREMENTAL'}`.padEnd(61) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  const startTime = Date.now();

  try {
    const result = isFullRebuild
      ? await ingestFull()
      : await ingestIncremental();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    INGESTION COMPLETE                    ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Files scanned:    ${String(result.filesScanned).padStart(6)}                            ║`);
    console.log(`║  Files updated:    ${String(result.filesUpdated).padStart(6)}                            ║`);
    console.log(`║  Files deleted:    ${String(result.filesDeleted).padStart(6)}                            ║`);
    console.log(`║  Chunks upserted:  ${String(result.chunksUpserted).padStart(6)}                            ║`);
    console.log(`║  Chunks deleted:   ${String(result.chunksDeleted).padStart(6)}                            ║`);
    console.log(`║  Duration:         ${duration.padStart(6)}s                           ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');

    if (result.errors.length > 0) {
      console.log(`║  ⚠️  Errors: ${result.errors.length}`.padEnd(61) + '║');
      for (const error of result.errors) {
        console.log(`║    - ${error.slice(0, 52)}`.padEnd(61) + '║');
      }
    } else {
      console.log('║  ✅ No errors                                            ║');
    }

    console.log('╚══════════════════════════════════════════════════════════╝');

    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    logger.error({ error }, 'Ingestion failed');
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
