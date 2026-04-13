import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import { hashPassword } from './auth';

const DB_NAME = process.env.MONGODB_DB || 'water_quality';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended';
  password?: string;
  image?: string;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const user = await db.collection<User>('users').findOne({ email });
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const user = await db
      .collection<User>('users')
      .findOne({ _id: new ObjectId(id) });
    return user;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.collection<Omit<User, '_id'>>('users').insertOne({
      name,
      email,
      role,
      status: 'active',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the created user
    const user = await db
      .collection<User>('users')
      .findOne({ _id: result.insertedId });
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  updates: Partial<Omit<User, '_id' | 'createdAt'>>
): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection<User>('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    const user = await getUserById(id);
    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

/**
 * Update user password by email
 */
export async function updateUserPasswordByEmail(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const hashedPassword = await hashPassword(password);

    const result = await db.collection<User>('users').updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    return result.matchedCount > 0;
  } catch (error) {
    console.error('Error updating password by email:', error);
    return false;
  }
}
