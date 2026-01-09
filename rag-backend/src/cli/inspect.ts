#!/usr/bin/env node
/**
 * CLI script for inspecting Qdrant collection
 * Usage:
 *   tsx src/cli/inspect.ts
 */

import { getQdrantClient, getCollectionInfo } from '../services/qdrant.js';
import { env, logger } from '../config/index.js';

async function main() {
  console.log('Inspecting Qdrant collection...');

  try {
    const info = await getCollectionInfo();
    if (!info) {
      console.log('Collection does not exist');
      return;
    }

    console.log(`Collection: ${env.QDRANT_COLLECTION}`);
    console.log(`Points: ${info.points_count}`);
    console.log(`Vector size: ${info.config?.params?.vectors?.size || 'unknown'}`);

    // Scroll through first 5 points
    const qdrant = getQdrantClient();
    const scrollResult = await qdrant.scroll(env.QDRANT_COLLECTION, {
      limit: 5,
      with_payload: true,
      with_vectors: true,
    });

    console.log('\nFirst 5 points:');
    for (const point of scrollResult.points) {
      console.log(`- ID: ${point.id}`);
      console.log(`  Vector length: ${(point.vector as number[]).length}`);
      console.log(`  Payload keys: ${Object.keys(point.payload || {})}`);
      const content = (point.payload as any)?.content;
      if (content) {
        console.log(`  Content length: ${content.length}`);
        console.log(`  Content preview: ${content.slice(0, 100)}...`);
      } else {
        console.log('  No content in payload');
      }
      console.log();
    }

  } catch (error) {
    console.error('Error inspecting collection:', error);
  }
}

main().catch(console.error);