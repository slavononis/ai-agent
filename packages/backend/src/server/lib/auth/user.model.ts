import { Collection, Db, ObjectId } from 'mongodb';
import dbConnect from '../mongoDB';
import { User, UserPublic } from './types';

let usersCollection: Collection<User> | null = null;

export async function getUsersCollection(): Promise<Collection<User>> {
  if (usersCollection) {
    return usersCollection;
  }

  const client = await dbConnect();
  const db: Db = client.db('auth');
  usersCollection = db.collection<User>('users');

  // Create indexes
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ createdAt: -1 });

  return usersCollection;
}

export async function createUser(
  userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>
): Promise<UserPublic> {
  const collection = await getUsersCollection();
  const now = new Date();

  const user: User = {
    ...userData,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(user);

  const createdUser = await collection.findOne({ _id: result.insertedId });
  if (!createdUser) {
    throw new Error('Failed to create user');
  }

  return {
    _id: createdUser._id!.toString(),
    email: createdUser.email,
    name: createdUser.name,
    createdAt: createdUser.createdAt,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ email: email.toLowerCase() });
}

export async function findUserById(userId: string): Promise<User | null> {
  const collection = await getUsersCollection();
  try {
    return collection.findOne({ _id: new ObjectId(userId) as any });
  } catch {
    return null;
  }
}

export function userToPublic(user: User): UserPublic {
  return {
    _id: user._id!.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
