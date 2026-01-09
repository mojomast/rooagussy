declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): { columns: string[]; values: any[][] }[];
    close(): void;
    export(): Uint8Array;
  }
  export interface SQLModule {
    Database: new (data?: Uint8Array) => Database;
  }
  export function initSqlJs(config?: any): Promise<SQLModule>;
  const initSqlJsDefault: (config?: any) => Promise<SQLModule>;
  export default initSqlJsDefault;
}

declare module '@langchain/openai' {
  export class OpenAIEmbeddings {
    constructor(config: any);
    embedQuery(text: string): Promise<number[]>;
    embedDocuments(texts: string[]): Promise<number[][]>;
  }
  export class ChatOpenAI {
    constructor(config: any);
    invoke(messages: any[]): Promise<any>;
  }
}

declare module '@qdrant/js-client-rest' {
  export class QdrantClient {
    constructor(config: any);
    getCollections(): Promise<{ collections: { name: string }[] }>;
    createCollection(name: string, config: any): Promise<void>;
    deleteCollection(name: string): Promise<void>;
    createPayloadIndex(collectionName: string, config: any): Promise<void>;
    getCollection(name: string): Promise<any>;
    upsert(collectionName: string, points: any): Promise<void>;
    search(collectionName: string, config: any): Promise<any[]>;
    delete(collectionName: string, config: any): Promise<void>;
  }
}

declare module 'tiktoken' {
  export function encoding_for_model(model: string): any;
}

declare module 'pino-pretty';
