import { db } from '../db';
import { reservationsTable, usersTable, restaurantsTable } from '../db/schema';
import { type CreateReservationInput, type UpdateReservationInput, type Reservation } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createReservation = async (input: CreateReservationInput): Promise<Reservation> => {
  try {
    // Validate that customer exists
    const customer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Validate that restaurant exists
    const restaurant = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, input.restaurant_id))
      .execute();

    if (restaurant.length === 0) {
      throw new Error('Restaurant not found');
    }

    // Insert reservation record
    const result = await db.insert(reservationsTable)
      .values({
        customer_id: input.customer_id,
        restaurant_id: input.restaurant_id,
        reservation_date: input.reservation_date,
        party_size: input.party_size,
        special_requests: input.special_requests,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reservation creation failed:', error);
    throw error;
  }
};

export const updateReservation = async (input: UpdateReservationInput): Promise<Reservation> => {
  try {
    // Check if reservation exists
    const existing = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Reservation not found');
    }

    // Build update values - only include fields that are provided
    const updateValues: Partial<typeof reservationsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateValues.status = input.status;
    }

    if (input.special_requests !== undefined) {
      updateValues.special_requests = input.special_requests;
    }

    // Update reservation record
    const result = await db.update(reservationsTable)
      .set(updateValues)
      .where(eq(reservationsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reservation update failed:', error);
    throw error;
  }
};

export const getReservation = async (id: number): Promise<Reservation | null> => {
  try {
    const result = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Reservation fetch failed:', error);
    throw error;
  }
};

export const getCustomerReservations = async (customerId: number): Promise<Reservation[]> => {
  try {
    const result = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.customer_id, customerId))
      .execute();

    return result;
  } catch (error) {
    console.error('Customer reservations fetch failed:', error);
    throw error;
  }
};

export const getRestaurantReservations = async (restaurantId: number): Promise<Reservation[]> => {
  try {
    const result = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.restaurant_id, restaurantId))
      .execute();

    return result;
  } catch (error) {
    console.error('Restaurant reservations fetch failed:', error);
    throw error;
  }
};

export const cancelReservation = async (id: number, userId: number): Promise<boolean> => {
  try {
    // Get the reservation to check ownership
    const reservation = await db.select()
      .from(reservationsTable)
      .innerJoin(restaurantsTable, eq(reservationsTable.restaurant_id, restaurantsTable.id))
      .where(eq(reservationsTable.id, id))
      .execute();

    if (reservation.length === 0) {
      throw new Error('Reservation not found');
    }

    const reservationData = reservation[0].reservations;
    const restaurantData = reservation[0].restaurants;

    // Check if user is the customer who made the reservation or the restaurant partner
    const isCustomer = reservationData.customer_id === userId;
    const isPartner = restaurantData.partner_id === userId;

    if (!isCustomer && !isPartner) {
      throw new Error('Unauthorized to cancel this reservation');
    }

    // Update reservation status to cancelled
    await db.update(reservationsTable)
      .set({ 
        status: 'cancelled',
        updated_at: new Date()
      })
      .where(eq(reservationsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Reservation cancellation failed:', error);
    throw error;
  }
};