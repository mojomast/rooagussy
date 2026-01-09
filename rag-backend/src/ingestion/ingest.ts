import { createHash } from 'crypto';
import { logger } from '../config/index.js';
import { readAllDocs, type DocFile } from './document-reader.js';
import { chunkDocument, type DocChunk } from './chunker.js';
import { embedChunks, type EmbeddedChunk } from './embedder.js';
import {
  initStateStore,
  getFileState,
  getAllFileStates,
  updateFileState,
  deleteFileState,
  clearAllState,
  closeStateStore,
} from './state-store.js';
import {
  ensureCollection,
  upsertVectors,
  deleteVectorsByFilter,
  getCollectionInfo,
  getQdrantClient,
} from '../services/qdrant.js';
import { env } from '../config/index.js';

function hashFileContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export interface IngestResult {
  filesScanned: number;
  filesUpdated: number;
  filesDeleted: number;
  chunksUpserted: number;
  chunksDeleted: number;
  errors: string[];
}

export async function ingestIncremental(): Promise<IngestResult> {
  const result: IngestResult = {
    filesScanned: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    chunksUpserted: 0,
    chunksDeleted: 0,
    errors: [],
  };

  try {
    await initStateStore();
    await ensureCollection();

    // Read all current docs
    const docs = await readAllDocs();
    result.filesScanned = docs.length;

    const currentFilePaths = new Set(docs.map(d => d.filePath));

    // Get previously indexed files
    const previousStates = await getAllFileStates();
    const previousFilePaths = new Set(previousStates.map(s => s.filePath));

    // Find files to delete (no longer exist)
    for (const state of previousStates) {
      if (!currentFilePaths.has(state.filePath)) {
        logger.info({ file: state.filePath }, 'Deleting removed file from index');

        try {
          const chunkIds = await deleteFileState(state.filePath);
          
          // Delete from Qdrant by source_file filter
          await deleteVectorsByFilter({
            must: [{ key: 'source_file', match: { value: state.filePath } }],
          });

          result.filesDeleted++;
          result.chunksDeleted += chunkIds.length;
        } catch (error) {
          const msg = `Failed to delete ${state.filePath}: ${error}`;
          logger.error({ error, file: state.filePath }, 'Delete failed');
          result.errors.push(msg);
        }
      }
    }

    // Process each doc
    const chunksToEmbed: DocChunk[] = [];
    const fileChunkMap = new Map<string, DocChunk[]>();

    for (const doc of docs) {
      const contentHash = hashFileContent(doc.content);
      const state = await getFileState(doc.filePath);

      if (state && state.contentHash === contentHash) {
        // File unchanged, skip
        logger.debug({ file: doc.filePath }, 'File unchanged, skipping');
        continue;
      }

      logger.info(
        { file: doc.filePath, isNew: !state },
        state ? 'File changed, re-indexing' : 'New file, indexing'
      );

      const chunks = chunkDocument(doc);
      chunksToEmbed.push(...chunks);
      fileChunkMap.set(doc.filePath, chunks);
    }

    if (chunksToEmbed.length === 0) {
      logger.info('No changes detected, nothing to embed');
      return result;
    }

    // Embed all chunks
    logger.info({ chunks: chunksToEmbed.length }, 'Embedding chunks');
    const embeddedChunks = await embedChunks(chunksToEmbed, (done, total) => {
      logger.debug({ done, total }, 'Embedding progress');
    });

    // Upsert to Qdrant and update state
    const embeddedMap = new Map<string, EmbeddedChunk[]>();
    for (const chunk of embeddedChunks) {
      const file = chunk.metadata.source_file;
      if (!embeddedMap.has(file)) {
        embeddedMap.set(file, []);
      }
      embeddedMap.get(file)!.push(chunk);
    }

    for (const [filePath, chunks] of embeddedMap) {
      try {
        // Delete old chunks for this file first (if updating)
        const oldState = await getFileState(filePath);
        if (oldState) {
          await deleteVectorsByFilter({
            must: [{ key: 'source_file', match: { value: filePath } }],
          });
          result.chunksDeleted += oldState.chunkCount;
        }

        // Upsert new chunks
        await upsertVectors(
          chunks.map(c => ({
            id: c.id,
            vector: c.embedding,
            payload: { ...c.metadata, content: c.content },
          }))
        );

        // Find the original doc to get content hash
        const doc = docs.find(d => d.filePath === filePath);
        if (doc) {
          const contentHash = hashFileContent(doc.content);
          await updateFileState(filePath, contentHash, chunks.map(c => c.id));
        }

        result.filesUpdated++;
        result.chunksUpserted += chunks.length;

        logger.info(
          { file: filePath, chunks: chunks.length },
          'File indexed successfully'
        );
      } catch (error) {
        const msg = `Failed to upsert ${filePath}: ${error}`;
        logger.error({ error, file: filePath }, 'Upsert failed');
        result.errors.push(msg);
      }
    }

    logger.info(result, 'Incremental ingestion complete');
    return result;
  } finally {
    await closeStateStore();
  }
}

export async function ingestFull(): Promise<IngestResult> {
  const result: IngestResult = {
    filesScanned: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    chunksUpserted: 0,
    chunksDeleted: 0,
    errors: [],
  };

  try {
    await initStateStore();
    
    // Delete entire collection and recreate
    const qdrant = getQdrantClient();
    const collectionName = env.QDRANT_COLLECTION;

    try {
      const info = await getCollectionInfo();
      if (info) {
        result.chunksDeleted = info.points_count || 0;
        logger.info({ collection: collectionName }, 'Deleting existing collection');
        await qdrant.deleteCollection(collectionName);
      }
    } catch {
      // Collection doesn't exist, that's fine
    }

    // Clear state
    await clearAllState();

    // Recreate collection
    await ensureCollection();

    // Read and process all docs
    const docs = await readAllDocs();
    result.filesScanned = docs.length;

    // Chunk all docs
    const allChunks: DocChunk[] = [];
    const fileChunkMap = new Map<string, DocChunk[]>();

    for (const doc of docs) {
      const chunks = chunkDocument(doc);
      allChunks.push(...chunks);
      fileChunkMap.set(doc.filePath, chunks);
    }

    logger.info(
      { files: docs.length, chunks: allChunks.length },
      'Chunked all documents'
    );

    // Embed all chunks
    const embeddedChunks = await embedChunks(allChunks, (done, total) => {
      logger.info({ done, total }, 'Embedding progress');
    });

    // Upsert in batches
    const UPSERT_BATCH_SIZE = 100;
    for (let i = 0; i < embeddedChunks.length; i += UPSERT_BATCH_SIZE) {
      const batch = embeddedChunks.slice(i, i + UPSERT_BATCH_SIZE);
      
      await upsertVectors(
        batch.map(c => ({
          id: c.id,
          vector: c.embedding,
          payload: { ...c.metadata, content: c.content },
        }))
      );

      logger.debug(
        { progress: Math.min(i + UPSERT_BATCH_SIZE, embeddedChunks.length), total: embeddedChunks.length },
        'Upsert progress'
      );
    }

    result.chunksUpserted = embeddedChunks.length;

    // Update state for all files
    for (const doc of docs) {
      const chunks = fileChunkMap.get(doc.filePath) || [];
      const contentHash = hashFileContent(doc.content);
      await updateFileState(doc.filePath, contentHash, chunks.map(c => c.id));
      result.filesUpdated++;
    }

    logger.info(result, 'Full ingestion complete');
    return result;
  } finally {
    await closeStateStore();
  }
}
