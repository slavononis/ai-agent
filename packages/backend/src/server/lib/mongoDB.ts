import { MongoClient, Collection, Document as MongoDocument } from 'mongodb';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';

declare global {
  var _mongo: {
    client: MongoClient | null;
    promise: Promise<MongoClient> | null;
  };
}

let cached = global._mongo;

if (!cached) {
  cached = global._mongo = { client: null, promise: null };
}

async function dbConnect() {
  const MONGODB_ATLAS_URI = process.env.MONGODB_ATLAS_URI;
  if (!MONGODB_ATLAS_URI) {
    throw new Error(
      'Please define the MONGODB_ATLAS_URI environment variable inside .env.local'
    );
  }

  if (cached?.client) {
    return cached.client.connect();
  }

  if (!cached?.promise) {
    const client = new MongoClient(MONGODB_ATLAS_URI, {
      maxPoolSize: 5, // 👈 limit pool size
    });
    cached.promise = client.connect().then((client) => client);
  }

  try {
    cached.client = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.client.connect();
}

export default dbConnect;

type ConnectionType = 'user-chat' | 'user-project';

let initializedInstance: Record<
  ConnectionType,
  {
    client: MongoClient;
    checkpointer: MongoDBSaver;
    chatMetadataCollection: Collection<MongoDocument & any>;
  } | null
> = {
  'user-chat': null,
  'user-project': null,
};

export const initializeMongoDB = async <M = object>(
  mode: ConnectionType
): Promise<{
  client: MongoClient;
  checkpointer: MongoDBSaver;
  chatMetadataCollection: Collection<MongoDocument & M>;
}> => {
  const isUserChat = mode === 'user-chat';
  try {
    const currentInstance = initializedInstance?.[mode] || null;
    if (currentInstance) {
      return currentInstance;
    }
    const client = await dbConnect();
    const dbName = isUserChat
      ? 'user-chat-checkpoint'
      : 'user-project-checkpoint';
    const metaDBName = isUserChat ? 'chat_metadata' : 'project_metadata';
    const checkpointer = new MongoDBSaver({ client, dbName });
    const db = client.db(dbName);

    const chatMetadataCollection = db.collection(metaDBName) as Collection<
      MongoDocument & M
    >;
    chatMetadataCollection;

    await chatMetadataCollection.createIndex(
      { thread_id: 1 },
      { unique: true }
    );
    await chatMetadataCollection.createIndex({ updated_at: -1 });

    initializedInstance[mode] = {
      client,
      checkpointer,
      chatMetadataCollection,
    };

    return { client, checkpointer, chatMetadataCollection };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};
