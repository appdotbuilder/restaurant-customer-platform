import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple password hashing (in production, use bcrypt)
const hashPassword = async (password: string): Promise<string> => {
  // Using Buffer.from with base64 encoding as a simple hash for demo purposes
  // In production, use bcrypt: return await bcrypt.hash(password, 10);
  return Buffer.from(password + 'salt').toString('base64');
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  // Simple verification matching our simple hash
  // In production, use bcrypt: return await bcrypt.compare(password, hash);
  const expectedHash = Buffer.from(password + 'salt').toString('base64');
  return expectedHash === hash;
};

const generateToken = (userId: number): string => {
  // Simple JWT-like token implementation using crypto
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ 
    userId, 
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  })).toString('base64url');
  
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
    
  return `${header}.${payload}.${signature}`;
};

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function registerUser(input: RegisterUserInput): Promise<{ user: User; token: string }> {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const passwordHash = await hashPassword(input.password);

    // Create user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        role: input.role
      })
      .returning()
      .execute();

    const newUser = result[0];

    // Generate JWT token
    const token = generateToken(newUser.id);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        password_hash: newUser.password_hash,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        role: newUser.role,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}