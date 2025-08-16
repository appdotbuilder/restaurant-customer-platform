import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterUserInput } from '../schema';
import { loginUser, registerUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test data
const testRegisterInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  role: 'customer'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

const testPartnerInput: RegisterUserInput = {
  email: 'partner@example.com',
  password: 'partnerpass123',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '+0987654321',
  role: 'partner'
};

describe('Auth Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should create a customer user', async () => {
      const result = await registerUser(testRegisterInput);

      // Verify returned user data
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.first_name).toEqual('John');
      expect(result.user.last_name).toEqual('Doe');
      expect(result.user.phone).toEqual('+1234567890');
      expect(result.user.role).toEqual('customer');
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
      expect(result.user.password_hash).toBeDefined();
      expect(result.user.password_hash).not.toEqual('password123'); // Should be hashed

      // Verify JWT token is generated
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('should create a partner user', async () => {
      const result = await registerUser(testPartnerInput);

      expect(result.user.email).toEqual('partner@example.com');
      expect(result.user.first_name).toEqual('Jane');
      expect(result.user.last_name).toEqual('Smith');
      expect(result.user.phone).toEqual('+0987654321');
      expect(result.user.role).toEqual('partner');
      expect(result.user.id).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should save user to database', async () => {
      const result = await registerUser(testRegisterInput);

      // Query database directly to verify user was saved
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].first_name).toEqual('John');
      expect(users[0].last_name).toEqual('Doe');
      expect(users[0].phone).toEqual('+1234567890');
      expect(users[0].role).toEqual('customer');
      expect(users[0].password_hash).toBeDefined();
      expect(users[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle user with null phone', async () => {
      const inputWithNullPhone: RegisterUserInput = {
        ...testRegisterInput,
        phone: null
      };

      const result = await registerUser(inputWithNullPhone);

      expect(result.user.phone).toBeNull();
      expect(result.user.email).toEqual('test@example.com');
    });

    it('should throw error for duplicate email', async () => {
      // Create first user
      await registerUser(testRegisterInput);

      // Try to create another user with same email
      await expect(registerUser(testRegisterInput)).rejects.toThrow(/already exists/i);
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await registerUser(testRegisterInput);
    });

    it('should login with valid credentials', async () => {
      const result = await loginUser(testLoginInput);

      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.first_name).toEqual('John');
      expect(result.user.last_name).toEqual('Doe');
      expect(result.user.phone).toEqual('+1234567890');
      expect(result.user.role).toEqual('customer');
      expect(result.user.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for invalid email', async () => {
      const invalidLoginInput: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await expect(loginUser(invalidLoginInput)).rejects.toThrow(/invalid credentials/i);
    });

    it('should throw error for invalid password', async () => {
      const invalidPasswordInput: LoginInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid credentials/i);
    });

    it('should login partner user', async () => {
      // Create a partner user
      await registerUser(testPartnerInput);

      const partnerLoginInput: LoginInput = {
        email: 'partner@example.com',
        password: 'partnerpass123'
      };

      const result = await loginUser(partnerLoginInput);

      expect(result.user.email).toEqual('partner@example.com');
      expect(result.user.role).toEqual('partner');
      expect(result.token).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    let testUserId: number;

    beforeEach(async () => {
      // Create a test user
      const result = await registerUser(testRegisterInput);
      testUserId = result.user.id;
    });

    it('should return user for valid user ID', async () => {
      const user = await getCurrentUser(testUserId);

      expect(user).not.toBeNull();
      expect(user!.id).toEqual(testUserId);
      expect(user!.email).toEqual('test@example.com');
      expect(user!.first_name).toEqual('John');
      expect(user!.last_name).toEqual('Doe');
      expect(user!.phone).toEqual('+1234567890');
      expect(user!.role).toEqual('customer');
      expect(user!.created_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent user ID', async () => {
      const user = await getCurrentUser(99999);

      expect(user).toBeNull();
    });

    it('should return partner user correctly', async () => {
      const partnerResult = await registerUser(testPartnerInput);
      const partnerUserId = partnerResult.user.id;

      const user = await getCurrentUser(partnerUserId);

      expect(user).not.toBeNull();
      expect(user!.id).toEqual(partnerUserId);
      expect(user!.email).toEqual('partner@example.com');
      expect(user!.role).toEqual('partner');
    });
  });

  describe('Integration tests', () => {
    it('should register, login, and get current user in sequence', async () => {
      // Register a new user
      const registerResult = await registerUser(testRegisterInput);
      expect(registerResult.user.email).toEqual('test@example.com');

      // Login with the same credentials
      const loginResult = await loginUser(testLoginInput);
      expect(loginResult.user.id).toEqual(registerResult.user.id);
      expect(loginResult.user.email).toEqual('test@example.com');

      // Get current user by ID
      const currentUser = await getCurrentUser(loginResult.user.id);
      expect(currentUser).not.toBeNull();
      expect(currentUser!.id).toEqual(registerResult.user.id);
      expect(currentUser!.email).toEqual('test@example.com');
    });

    it('should handle multiple users correctly', async () => {
      // Create customer
      const customerResult = await registerUser(testRegisterInput);
      
      // Create partner
      const partnerResult = await registerUser(testPartnerInput);

      // Verify both users exist and have different IDs
      expect(customerResult.user.id).not.toEqual(partnerResult.user.id);

      // Login as customer
      const customerLogin = await loginUser(testLoginInput);
      expect(customerLogin.user.role).toEqual('customer');

      // Login as partner
      const partnerLogin = await loginUser({
        email: 'partner@example.com',
        password: 'partnerpass123'
      });
      expect(partnerLogin.user.role).toEqual('partner');

      // Get both users
      const customer = await getCurrentUser(customerResult.user.id);
      const partner = await getCurrentUser(partnerResult.user.id);

      expect(customer!.role).toEqual('customer');
      expect(partner!.role).toEqual('partner');
    });
  });
});