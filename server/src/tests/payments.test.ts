import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, usersTable, ordersTable, reservationsTable, restaurantsTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import {
  createPayment,
  updatePayment,
  getPayment,
  getUserPayments,
  getOrderPayments,
  getReservationPayments,
  processPayment,
  refundPayment
} from '../handlers/payments';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'customer@test.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  phone: '555-1234',
  role: 'customer' as const
};

const testPartner = {
  email: 'partner@test.com',
  password_hash: 'hashed_password',
  first_name: 'Jane',
  last_name: 'Partner',
  phone: '555-5678',
  role: 'partner' as const
};

const testRestaurant = {
  name: 'Test Restaurant',
  description: 'A test restaurant',
  address: '123 Test St',
  phone: '555-0000',
  email: 'restaurant@test.com',
  opening_hours: '{"monday": "9-17", "tuesday": "9-17"}',
  cuisine_type: 'Italian'
};

const testOrder = {
  status: 'pending' as const,
  total_amount: '25.99',
  delivery_address: '456 Customer St',
  special_instructions: 'Test order'
};

const testReservation = {
  reservation_date: new Date('2024-01-15T19:00:00Z'),
  party_size: 4,
  status: 'pending' as const,
  special_requests: 'Window seat please'
};

const testPaymentInput: CreatePaymentInput = {
  user_id: 0, // Will be set in tests
  order_id: null,
  reservation_id: null,
  type: 'order',
  amount: 25.99,
  payment_method: 'credit_card'
};

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a payment for an order', async () => {
    // Create test user and order
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const partnerResult = await db.insert(usersTable).values(testPartner).returning().execute();
    const partner = partnerResult[0];

    const restaurantResult = await db.insert(restaurantsTable)
      .values({ ...testRestaurant, partner_id: partner.id })
      .returning()
      .execute();
    const restaurant = restaurantResult[0];

    const orderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: user.id,
        restaurant_id: restaurant.id
      })
      .returning()
      .execute();
    const order = orderResult[0];

    // Create payment
    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      order_id: order.id,
      type: 'order'
    };

    const result = await createPayment(paymentInput);

    // Verify payment fields
    expect(result.user_id).toEqual(user.id);
    expect(result.order_id).toEqual(order.id);
    expect(result.reservation_id).toBeNull();
    expect(result.type).toEqual('order');
    expect(result.amount).toEqual(25.99);
    expect(typeof result.amount).toEqual('number');
    expect(result.status).toEqual('pending');
    expect(result.payment_method).toEqual('credit_card');
    expect(result.transaction_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a payment for a reservation', async () => {
    // Create test user and reservation
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const partnerResult = await db.insert(usersTable).values(testPartner).returning().execute();
    const partner = partnerResult[0];

    const restaurantResult = await db.insert(restaurantsTable)
      .values({ ...testRestaurant, partner_id: partner.id })
      .returning()
      .execute();
    const restaurant = restaurantResult[0];

    const reservationResult = await db.insert(reservationsTable)
      .values({
        ...testReservation,
        customer_id: user.id,
        restaurant_id: restaurant.id
      })
      .returning()
      .execute();
    const reservation = reservationResult[0];

    // Create payment
    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      order_id: null,
      reservation_id: reservation.id,
      type: 'reservation',
      amount: 15.00
    };

    const result = await createPayment(paymentInput);

    expect(result.user_id).toEqual(user.id);
    expect(result.order_id).toBeNull();
    expect(result.reservation_id).toEqual(reservation.id);
    expect(result.type).toEqual('reservation');
    expect(result.amount).toEqual(15.00);
    expect(result.status).toEqual('pending');
  });

  it('should save payment to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const result = await createPayment(paymentInput);

    // Verify in database
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].user_id).toEqual(user.id);
    expect(parseFloat(payments[0].amount)).toEqual(25.99);
    expect(payments[0].status).toEqual('pending');
  });

  it('should throw error for non-existent user', async () => {
    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: 9999
    };

    await expect(createPayment(paymentInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent order', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      order_id: 9999,
      type: 'order'
    };

    await expect(createPayment(paymentInput)).rejects.toThrow(/order not found/i);
  });

  it('should throw error for non-existent reservation', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      reservation_id: 9999,
      type: 'reservation'
    };

    await expect(createPayment(paymentInput)).rejects.toThrow(/reservation not found/i);
  });
});

describe('updatePayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update payment status', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const payment = await createPayment(paymentInput);

    // Update payment
    const result = await updatePayment({
      id: payment.id,
      status: 'completed',
      transaction_id: 'txn_12345'
    });

    expect(result.id).toEqual(payment.id);
    expect(result.status).toEqual('completed');
    expect(result.transaction_id).toEqual('txn_12345');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent payment', async () => {
    await expect(updatePayment({
      id: 9999,
      status: 'completed'
    })).rejects.toThrow(/payment not found/i);
  });
});

describe('getPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve payment by ID', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const createdPayment = await createPayment(paymentInput);

    // Get payment
    const result = await getPayment(createdPayment.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdPayment.id);
    expect(result!.user_id).toEqual(user.id);
    expect(result!.amount).toEqual(25.99);
    expect(typeof result!.amount).toEqual('number');
  });

  it('should return null for non-existent payment', async () => {
    const result = await getPayment(9999);
    expect(result).toBeNull();
  });
});

describe('getUserPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve all payments for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    // Create multiple payments
    const payment1Input: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      amount: 25.99
    };

    const payment2Input: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      amount: 15.50,
      payment_method: 'paypal'
    };

    await createPayment(payment1Input);
    await createPayment(payment2Input);

    // Get user payments
    const result = await getUserPayments(user.id);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[1].user_id).toEqual(user.id);
    expect(typeof result[0].amount).toEqual('number');
    expect(typeof result[1].amount).toEqual('number');

    // Check amounts
    const amounts = result.map(p => p.amount).sort();
    expect(amounts).toEqual([15.50, 25.99]);
  });

  it('should return empty array for user with no payments', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const result = await getUserPayments(user.id);
    expect(result).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    await expect(getUserPayments(9999)).rejects.toThrow(/user not found/i);
  });
});

describe('getOrderPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve all payments for an order', async () => {
    // Create test data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const partnerResult = await db.insert(usersTable).values(testPartner).returning().execute();
    const partner = partnerResult[0];

    const restaurantResult = await db.insert(restaurantsTable)
      .values({ ...testRestaurant, partner_id: partner.id })
      .returning()
      .execute();
    const restaurant = restaurantResult[0];

    const orderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: user.id,
        restaurant_id: restaurant.id
      })
      .returning()
      .execute();
    const order = orderResult[0];

    // Create payments for the order
    const payment1Input: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      order_id: order.id,
      type: 'order',
      amount: 20.00
    };

    const payment2Input: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      order_id: order.id,
      type: 'order',
      amount: 5.99
    };

    await createPayment(payment1Input);
    await createPayment(payment2Input);

    // Get order payments
    const result = await getOrderPayments(order.id);

    expect(result).toHaveLength(2);
    expect(result[0].order_id).toEqual(order.id);
    expect(result[1].order_id).toEqual(order.id);
    expect(result[0].type).toEqual('order');
    expect(result[1].type).toEqual('order');
  });

  it('should return empty array for order with no payments', async () => {
    // Create test data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const partnerResult = await db.insert(usersTable).values(testPartner).returning().execute();
    const partner = partnerResult[0];

    const restaurantResult = await db.insert(restaurantsTable)
      .values({ ...testRestaurant, partner_id: partner.id })
      .returning()
      .execute();
    const restaurant = restaurantResult[0];

    const orderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_id: user.id,
        restaurant_id: restaurant.id
      })
      .returning()
      .execute();
    const order = orderResult[0];

    const result = await getOrderPayments(order.id);
    expect(result).toHaveLength(0);
  });

  it('should throw error for non-existent order', async () => {
    await expect(getOrderPayments(9999)).rejects.toThrow(/order not found/i);
  });
});

describe('getReservationPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve all payments for a reservation', async () => {
    // Create test data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const partnerResult = await db.insert(usersTable).values(testPartner).returning().execute();
    const partner = partnerResult[0];

    const restaurantResult = await db.insert(restaurantsTable)
      .values({ ...testRestaurant, partner_id: partner.id })
      .returning()
      .execute();
    const restaurant = restaurantResult[0];

    const reservationResult = await db.insert(reservationsTable)
      .values({
        ...testReservation,
        customer_id: user.id,
        restaurant_id: restaurant.id
      })
      .returning()
      .execute();
    const reservation = reservationResult[0];

    // Create payment for the reservation
    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id,
      reservation_id: reservation.id,
      order_id: null,
      type: 'reservation',
      amount: 10.00
    };

    await createPayment(paymentInput);

    // Get reservation payments
    const result = await getReservationPayments(reservation.id);

    expect(result).toHaveLength(1);
    expect(result[0].reservation_id).toEqual(reservation.id);
    expect(result[0].type).toEqual('reservation');
    expect(result[0].amount).toEqual(10.00);
  });

  it('should throw error for non-existent reservation', async () => {
    await expect(getReservationPayments(9999)).rejects.toThrow(/reservation not found/i);
  });
});

describe('processPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process a pending payment', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const createdPayment = await createPayment(paymentInput);
    expect(createdPayment.status).toEqual('pending');

    // Process payment
    const result = await processPayment(createdPayment.id);

    expect(result.id).toEqual(createdPayment.id);
    expect(result.status).toEqual('processing');
    expect(result.transaction_id).toBeDefined();
    expect(result.transaction_id).toMatch(/^txn_/);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent payment', async () => {
    await expect(processPayment(9999)).rejects.toThrow(/payment not found/i);
  });

  it('should throw error for non-pending payment', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const createdPayment = await createPayment(paymentInput);

    // Update to completed first
    await updatePayment({
      id: createdPayment.id,
      status: 'completed'
    });

    // Try to process again
    await expect(processPayment(createdPayment.id))
      .rejects.toThrow(/cannot process payment with status/i);
  });
});

describe('refundPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should refund a completed payment', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const createdPayment = await createPayment(paymentInput);

    // Update to completed first
    const completedPayment = await updatePayment({
      id: createdPayment.id,
      status: 'completed',
      transaction_id: 'txn_original'
    });

    // Refund payment
    const result = await refundPayment(completedPayment.id);

    expect(result.id).toEqual(completedPayment.id);
    expect(result.status).toEqual('refunded');
    expect(result.transaction_id).toBeDefined();
    expect(result.transaction_id).toMatch(/^refund_/);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent payment', async () => {
    await expect(refundPayment(9999)).rejects.toThrow(/payment not found/i);
  });

  it('should throw error for non-completed payment', async () => {
    // Create test user and payment
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const user = userResult[0];

    const paymentInput: CreatePaymentInput = {
      ...testPaymentInput,
      user_id: user.id
    };

    const createdPayment = await createPayment(paymentInput);
    expect(createdPayment.status).toEqual('pending');

    // Try to refund pending payment
    await expect(refundPayment(createdPayment.id))
      .rejects.toThrow(/cannot refund payment with status/i);
  });
});