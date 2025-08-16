import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, restaurantsTable } from '../db/schema';
import { type CreateRestaurantInput } from '../schema';
import { createRestaurant } from '../handlers/restaurants';
import { eq } from 'drizzle-orm';

// Test data
const testPartner = {
  email: 'partner@test.com',
  password_hash: 'hashedpassword123',
  first_name: 'John',
  last_name: 'Doe',
  phone: '555-0123',
  role: 'partner' as const
};

const testCustomer = {
  email: 'customer@test.com',
  password_hash: 'hashedpassword456',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '555-0456',
  role: 'customer' as const
};

const testRestaurantInput: CreateRestaurantInput = {
  partner_id: 1, // Will be updated after partner creation
  name: 'Test Restaurant',
  description: 'A restaurant for testing',
  address: '123 Test Street, Test City',
  phone: '555-RESTAURANT',
  email: 'restaurant@test.com',
  opening_hours: '{"monday": "9:00-22:00", "tuesday": "9:00-22:00"}',
  cuisine_type: 'Italian'
};

describe('createRestaurant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a restaurant successfully', async () => {
    // Create a partner user first
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    
    const partner = partnerResult[0];
    const input = { ...testRestaurantInput, partner_id: partner.id };

    const result = await createRestaurant(input);

    // Verify restaurant fields
    expect(result.name).toEqual('Test Restaurant');
    expect(result.description).toEqual('A restaurant for testing');
    expect(result.address).toEqual('123 Test Street, Test City');
    expect(result.phone).toEqual('555-RESTAURANT');
    expect(result.email).toEqual('restaurant@test.com');
    expect(result.opening_hours).toEqual('{"monday": "9:00-22:00", "tuesday": "9:00-22:00"}');
    expect(result.cuisine_type).toEqual('Italian');
    expect(result.partner_id).toEqual(partner.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save restaurant to database', async () => {
    // Create a partner user first
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    
    const partner = partnerResult[0];
    const input = { ...testRestaurantInput, partner_id: partner.id };

    const result = await createRestaurant(input);

    // Verify restaurant was saved to database
    const restaurants = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, result.id))
      .execute();

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toEqual('Test Restaurant');
    expect(restaurants[0].description).toEqual('A restaurant for testing');
    expect(restaurants[0].address).toEqual('123 Test Street, Test City');
    expect(restaurants[0].partner_id).toEqual(partner.id);
    expect(restaurants[0].created_at).toBeInstanceOf(Date);
    expect(restaurants[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Create a partner user first
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    
    const partner = partnerResult[0];
    
    // Test with nullable fields set to null
    const inputWithNulls: CreateRestaurantInput = {
      partner_id: partner.id,
      name: 'Minimal Restaurant',
      description: null,
      address: '456 Simple Street',
      phone: '555-SIMPLE',
      email: null,
      opening_hours: '{"everyday": "24/7"}',
      cuisine_type: null
    };

    const result = await createRestaurant(inputWithNulls);

    expect(result.name).toEqual('Minimal Restaurant');
    expect(result.description).toBeNull();
    expect(result.email).toBeNull();
    expect(result.cuisine_type).toBeNull();
    expect(result.address).toEqual('456 Simple Street');
    expect(result.phone).toEqual('555-SIMPLE');
    expect(result.opening_hours).toEqual('{"everyday": "24/7"}');
  });

  it('should throw error when partner does not exist', async () => {
    const input = { ...testRestaurantInput, partner_id: 999 }; // Non-existent partner ID

    await expect(createRestaurant(input)).rejects.toThrow(/partner with id 999 not found/i);
  });

  it('should throw error when user is not a partner', async () => {
    // Create a customer user (not a partner)
    const customerResult = await db.insert(usersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    const customer = customerResult[0];
    const input = { ...testRestaurantInput, partner_id: customer.id };

    await expect(createRestaurant(input)).rejects.toThrow(/user with id .+ is not a partner/i);
  });

  it('should create multiple restaurants for the same partner', async () => {
    // Create a partner user first
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    
    const partner = partnerResult[0];

    // Create first restaurant
    const input1 = { ...testRestaurantInput, partner_id: partner.id, name: 'Restaurant One' };
    const result1 = await createRestaurant(input1);

    // Create second restaurant
    const input2 = { ...testRestaurantInput, partner_id: partner.id, name: 'Restaurant Two', address: '789 Another Street' };
    const result2 = await createRestaurant(input2);

    // Verify both restaurants exist
    expect(result1.name).toEqual('Restaurant One');
    expect(result2.name).toEqual('Restaurant Two');
    expect(result1.partner_id).toEqual(partner.id);
    expect(result2.partner_id).toEqual(partner.id);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are in database
    const allRestaurants = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.partner_id, partner.id))
      .execute();

    expect(allRestaurants).toHaveLength(2);
  });

  it('should handle complex opening hours JSON', async () => {
    // Create a partner user first
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    
    const partner = partnerResult[0];
    
    const complexOpeningHours = JSON.stringify({
      monday: { open: "09:00", close: "22:00", closed: false },
      tuesday: { open: "09:00", close: "22:00", closed: false },
      wednesday: { open: "09:00", close: "22:00", closed: false },
      thursday: { open: "09:00", close: "23:00", closed: false },
      friday: { open: "09:00", close: "23:00", closed: false },
      saturday: { open: "10:00", close: "23:00", closed: false },
      sunday: { closed: true }
    });

    const input = {
      ...testRestaurantInput,
      partner_id: partner.id,
      opening_hours: complexOpeningHours
    };

    const result = await createRestaurant(input);

    expect(result.opening_hours).toEqual(complexOpeningHours);

    // Verify it's stored correctly in database
    const restaurants = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, result.id))
      .execute();

    expect(restaurants[0].opening_hours).toEqual(complexOpeningHours);
  });
});