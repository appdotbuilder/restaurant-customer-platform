import { db } from '../db';
import { paymentsTable, usersTable, ordersTable, reservationsTable } from '../db/schema';
import { type CreatePaymentInput, type UpdatePaymentInput, type Payment } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Verify foreign key constraints based on payment type
    if (input.type === 'order' && input.order_id) {
      const order = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, input.order_id))
        .execute();

      if (order.length === 0) {
        throw new Error('Order not found');
      }
    }

    if (input.type === 'reservation' && input.reservation_id) {
      const reservation = await db.select()
        .from(reservationsTable)
        .where(eq(reservationsTable.id, input.reservation_id))
        .execute();

      if (reservation.length === 0) {
        throw new Error('Reservation not found');
      }
    }

    // Create payment record
    const result = await db.insert(paymentsTable)
      .values({
        user_id: input.user_id,
        order_id: input.order_id,
        reservation_id: input.reservation_id,
        type: input.type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        status: 'pending', // Always start as pending
        payment_method: input.payment_method,
        transaction_id: null // Initially null, updated when processed
      })
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}

export async function updatePayment(input: UpdatePaymentInput): Promise<Payment> {
  try {
    // Check if payment exists
    const existingPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, input.id))
      .execute();

    if (existingPayments.length === 0) {
      throw new Error('Payment not found');
    }

    // Build update values object dynamically
    const updateValues: any = {};
    
    if (input.status !== undefined) {
      updateValues.status = input.status;
    }
    
    if (input.transaction_id !== undefined) {
      updateValues.transaction_id = input.transaction_id;
    }

    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    // Update payment record
    const result = await db.update(paymentsTable)
      .set(updateValues)
      .where(eq(paymentsTable.id, input.id))
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment update failed:', error);
    throw error;
  }
}

export async function getPayment(id: number): Promise<Payment | null> {
  try {
    const result = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment fetch failed:', error);
    throw error;
  }
}

export async function getUserPayments(userId: number): Promise<Payment[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const result = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.user_id, userId))
      .execute();

    return result.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('User payments fetch failed:', error);
    throw error;
  }
}

export async function getOrderPayments(orderId: number): Promise<Payment[]> {
  try {
    // Verify order exists
    const order = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .execute();

    if (order.length === 0) {
      throw new Error('Order not found');
    }

    const result = await db.select()
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.order_id, orderId),
        eq(paymentsTable.type, 'order')
      ))
      .execute();

    return result.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Order payments fetch failed:', error);
    throw error;
  }
}

export async function getReservationPayments(reservationId: number): Promise<Payment[]> {
  try {
    // Verify reservation exists
    const reservation = await db.select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, reservationId))
      .execute();

    if (reservation.length === 0) {
      throw new Error('Reservation not found');
    }

    const result = await db.select()
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.reservation_id, reservationId),
        eq(paymentsTable.type, 'reservation')
      ))
      .execute();

    return result.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Reservation payments fetch failed:', error);
    throw error;
  }
}

export async function processPayment(paymentId: number): Promise<Payment> {
  try {
    // Check if payment exists and is in correct status
    const existingPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .execute();

    if (existingPayments.length === 0) {
      throw new Error('Payment not found');
    }

    const existingPayment = existingPayments[0];
    
    if (existingPayment.status !== 'pending') {
      throw new Error(`Cannot process payment with status: ${existingPayment.status}`);
    }

    // Simulate payment processing with external service
    // In a real implementation, this would integrate with Stripe, PayPal, etc.
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update payment status to processing
    const result = await db.update(paymentsTable)
      .set({
        status: 'processing',
        transaction_id: transactionId,
        updated_at: new Date()
      })
      .where(eq(paymentsTable.id, paymentId))
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
}

export async function refundPayment(paymentId: number): Promise<Payment> {
  try {
    // Check if payment exists and can be refunded
    const existingPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .execute();

    if (existingPayments.length === 0) {
      throw new Error('Payment not found');
    }

    const existingPayment = existingPayments[0];
    
    if (existingPayment.status !== 'completed') {
      throw new Error(`Cannot refund payment with status: ${existingPayment.status}`);
    }

    // Generate refund transaction ID
    const refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update payment status to refunded
    const result = await db.update(paymentsTable)
      .set({
        status: 'refunded',
        transaction_id: refundTransactionId,
        updated_at: new Date()
      })
      .where(eq(paymentsTable.id, paymentId))
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment refund failed:', error);
    throw error;
  }
}