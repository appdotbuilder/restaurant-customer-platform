import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, restaurantsTable, reservationsTable } from '../db/schema';
import { type CreateReservationInput, type UpdateReservationInput } from '../schema';
import { 
  createReservation, 
  updateReservation, 
  getReservation,
  getCustomerReservations,
  getRestaurantReservations,
  cancelReservation
} from '../handlers/reservations';
import { eq } from 'drizzle-orm';

// Test data
const testCustomer = {
  email: 'customer@test.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  role: 'customer' as const
};

const testPartner = {
  email: 'partner@test.com',
  password_hash: 'hashed_password',
  first_name: 'Jane',
  last_name: 'Smith',
  phone: '+1987654321',
  role: 'partner' as const
};

const testRestaurant = {
  name: 'Test Restaurant',
  description: 'A test restaurant',
  address: '123 Test St',
  phone: '+1555000000',
  email: 'restaurant@test.com',
  opening_hours: '{"monday": "9:00-22:00"}',
  cuisine_type: 'Italian'
};

describe('Reservation Handlers', () => {
  let customerId: number;
  let partnerId: number;
  let restaurantId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test customer
    const customerResult = await db.insert(usersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test partner
    const partnerResult = await db.insert(usersTable)
      .values(testPartner)
      .returning()
      .execute();
    partnerId = partnerResult[0].id;

    // Create test restaurant
    const restaurantResult = await db.insert(restaurantsTable)
      .values({
        ...testRestaurant,
        partner_id: partnerId
      })
      .returning()
      .execute();
    restaurantId = restaurantResult[0].id;
  });

  afterEach(resetDB);

  describe('createReservation', () => {
    const testReservationInput: CreateReservationInput = {
      customer_id: 0, // Will be set in tests
      restaurant_id: 0, // Will be set in tests
      reservation_date: new Date('2024-12-25T19:00:00Z'),
      party_size: 4,
      special_requests: 'Window table please'
    };

    it('should create a reservation successfully', async () => {
      const input = {
        ...testReservationInput,
        customer_id: customerId,
        restaurant_id: restaurantId
      };

      const result = await createReservation(input);

      expect(result.id).toBeDefined();
      expect(result.customer_id).toEqual(customerId);
      expect(result.restaurant_id).toEqual(restaurantId);
      expect(result.reservation_date).toEqual(input.reservation_date);
      expect(result.party_size).toEqual(4);
      expect(result.status).toEqual('pending');
      expect(result.special_requests).toEqual('Window table please');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save reservation to database', async () => {
      const input = {
        ...testReservationInput,
        customer_id: customerId,
        restaurant_id: restaurantId
      };

      const result = await createReservation(input);

      const reservations = await db.select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, result.id))
        .execute();

      expect(reservations).toHaveLength(1);
      expect(reservations[0].customer_id).toEqual(customerId);
      expect(reservations[0].restaurant_id).toEqual(restaurantId);
      expect(reservations[0].party_size).toEqual(4);
      expect(reservations[0].status).toEqual('pending');
    });

    it('should throw error for non-existent customer', async () => {
      const input = {
        ...testReservationInput,
        customer_id: 99999,
        restaurant_id: restaurantId
      };

      await expect(createReservation(input)).rejects.toThrow(/customer not found/i);
    });

    it('should throw error for non-existent restaurant', async () => {
      const input = {
        ...testReservationInput,
        customer_id: customerId,
        restaurant_id: 99999
      };

      await expect(createReservation(input)).rejects.toThrow(/restaurant not found/i);
    });
  });

  describe('updateReservation', () => {
    let reservationId: number;

    beforeEach(async () => {
      const input = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-25T19:00:00Z'),
        party_size: 4,
        special_requests: 'Original request'
      };

      const reservation = await createReservation(input);
      reservationId = reservation.id;
    });

    it('should update reservation status', async () => {
      const updateInput: UpdateReservationInput = {
        id: reservationId,
        status: 'confirmed'
      };

      const result = await updateReservation(updateInput);

      expect(result.id).toEqual(reservationId);
      expect(result.status).toEqual('confirmed');
      expect(result.special_requests).toEqual('Original request'); // Should remain unchanged
    });

    it('should update special requests', async () => {
      const updateInput: UpdateReservationInput = {
        id: reservationId,
        special_requests: 'Updated special request'
      };

      const result = await updateReservation(updateInput);

      expect(result.id).toEqual(reservationId);
      expect(result.status).toEqual('pending'); // Should remain unchanged
      expect(result.special_requests).toEqual('Updated special request');
    });

    it('should update multiple fields', async () => {
      const updateInput: UpdateReservationInput = {
        id: reservationId,
        status: 'confirmed',
        special_requests: 'Confirmed with new request'
      };

      const result = await updateReservation(updateInput);

      expect(result.status).toEqual('confirmed');
      expect(result.special_requests).toEqual('Confirmed with new request');
    });

    it('should throw error for non-existent reservation', async () => {
      const updateInput: UpdateReservationInput = {
        id: 99999,
        status: 'confirmed'
      };

      await expect(updateReservation(updateInput)).rejects.toThrow(/reservation not found/i);
    });
  });

  describe('getReservation', () => {
    let reservationId: number;

    beforeEach(async () => {
      const input = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-25T19:00:00Z'),
        party_size: 4,
        special_requests: 'Test request'
      };

      const reservation = await createReservation(input);
      reservationId = reservation.id;
    });

    it('should fetch existing reservation', async () => {
      const result = await getReservation(reservationId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(reservationId);
      expect(result!.customer_id).toEqual(customerId);
      expect(result!.restaurant_id).toEqual(restaurantId);
      expect(result!.party_size).toEqual(4);
      expect(result!.special_requests).toEqual('Test request');
    });

    it('should return null for non-existent reservation', async () => {
      const result = await getReservation(99999);

      expect(result).toBeNull();
    });
  });

  describe('getCustomerReservations', () => {
    let reservation1Id: number;
    let reservation2Id: number;

    beforeEach(async () => {
      // Create multiple reservations for the customer
      const input1 = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-25T19:00:00Z'),
        party_size: 4,
        special_requests: 'First reservation'
      };

      const input2 = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-26T20:00:00Z'),
        party_size: 2,
        special_requests: 'Second reservation'
      };

      const reservation1 = await createReservation(input1);
      const reservation2 = await createReservation(input2);
      reservation1Id = reservation1.id;
      reservation2Id = reservation2.id;
    });

    it('should fetch all customer reservations', async () => {
      const result = await getCustomerReservations(customerId);

      expect(result).toHaveLength(2);
      
      const reservationIds = result.map(r => r.id).sort();
      expect(reservationIds).toEqual([reservation1Id, reservation2Id].sort());
      
      result.forEach(reservation => {
        expect(reservation.customer_id).toEqual(customerId);
      });
    });

    it('should return empty array for customer with no reservations', async () => {
      // Create another customer
      const anotherCustomer = await db.insert(usersTable)
        .values({
          ...testCustomer,
          email: 'another@test.com'
        })
        .returning()
        .execute();

      const result = await getCustomerReservations(anotherCustomer[0].id);

      expect(result).toHaveLength(0);
    });
  });

  describe('getRestaurantReservations', () => {
    let reservation1Id: number;
    let reservation2Id: number;

    beforeEach(async () => {
      // Create multiple reservations for the restaurant
      const input1 = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-25T19:00:00Z'),
        party_size: 4,
        special_requests: 'First reservation'
      };

      const input2 = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-26T20:00:00Z'),
        party_size: 2,
        special_requests: 'Second reservation'
      };

      const reservation1 = await createReservation(input1);
      const reservation2 = await createReservation(input2);
      reservation1Id = reservation1.id;
      reservation2Id = reservation2.id;
    });

    it('should fetch all restaurant reservations', async () => {
      const result = await getRestaurantReservations(restaurantId);

      expect(result).toHaveLength(2);
      
      const reservationIds = result.map(r => r.id).sort();
      expect(reservationIds).toEqual([reservation1Id, reservation2Id].sort());
      
      result.forEach(reservation => {
        expect(reservation.restaurant_id).toEqual(restaurantId);
      });
    });

    it('should return empty array for restaurant with no reservations', async () => {
      // Create another restaurant
      const anotherRestaurant = await db.insert(restaurantsTable)
        .values({
          ...testRestaurant,
          name: 'Another Restaurant',
          partner_id: partnerId
        })
        .returning()
        .execute();

      const result = await getRestaurantReservations(anotherRestaurant[0].id);

      expect(result).toHaveLength(0);
    });
  });

  describe('cancelReservation', () => {
    let reservationId: number;

    beforeEach(async () => {
      const input = {
        customer_id: customerId,
        restaurant_id: restaurantId,
        reservation_date: new Date('2024-12-25T19:00:00Z'),
        party_size: 4,
        special_requests: 'Test reservation'
      };

      const reservation = await createReservation(input);
      reservationId = reservation.id;
    });

    it('should allow customer to cancel their own reservation', async () => {
      const result = await cancelReservation(reservationId, customerId);

      expect(result).toBe(true);

      // Verify reservation is cancelled
      const updatedReservation = await getReservation(reservationId);
      expect(updatedReservation!.status).toEqual('cancelled');
    });

    it('should allow restaurant partner to cancel reservation', async () => {
      const result = await cancelReservation(reservationId, partnerId);

      expect(result).toBe(true);

      // Verify reservation is cancelled
      const updatedReservation = await getReservation(reservationId);
      expect(updatedReservation!.status).toEqual('cancelled');
    });

    it('should throw error for unauthorized user', async () => {
      // Create another user
      const unauthorizedUser = await db.insert(usersTable)
        .values({
          ...testCustomer,
          email: 'unauthorized@test.com'
        })
        .returning()
        .execute();

      await expect(cancelReservation(reservationId, unauthorizedUser[0].id))
        .rejects.toThrow(/unauthorized/i);
    });

    it('should throw error for non-existent reservation', async () => {
      await expect(cancelReservation(99999, customerId))
        .rejects.toThrow(/reservation not found/i);
    });
  });
});