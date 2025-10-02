import { MongoClient } from 'mongodb';

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
