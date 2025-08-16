import { db } from '../db';
import { ordersTable, orderItemsTable, menuItemsTable, usersTable, restaurantsTable } from '../db/schema';
import { type CreateOrderInput, type UpdateOrderInput, type Order, type CreateOrderItemInput, type OrderItem } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  try {
    // Validate customer exists
    const customer = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found');
    }

    // Validate restaurant exists
    const restaurant = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, input.restaurant_id))
      .execute();

    if (restaurant.length === 0) {
      throw new Error('Restaurant not found');
    }

    // Insert order record with initial total amount of 0
    const result = await db.insert(ordersTable)
      .values({
        customer_id: input.customer_id,
        restaurant_id: input.restaurant_id,
        status: 'pending',
        total_amount: '0.00', // Convert number to string for numeric column
        delivery_address: input.delivery_address,
        special_instructions: input.special_instructions
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}

export async function updateOrder(input: UpdateOrderInput): Promise<Order> {
  try {
    // Validate order exists
    const existingOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.id))
      .execute();

    if (existingOrder.length === 0) {
      throw new Error('Order not found');
    }

    // Build update values object dynamically
    const updateValues: any = {};
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.delivery_address !== undefined) updateValues.delivery_address = input.delivery_address;
    if (input.special_instructions !== undefined) updateValues.special_instructions = input.special_instructions;

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateValues)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Order update failed:', error);
    throw error;
  }
}

export async function getOrder(id: number): Promise<Order | null> {
  try {
    const result = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Order retrieval failed:', error);
    throw error;
  }
}

export async function getCustomerOrders(customerId: number): Promise<Order[]> {
  try {
    const result = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.customer_id, customerId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return result.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Customer orders retrieval failed:', error);
    throw error;
  }
}

export async function getRestaurantOrders(restaurantId: number): Promise<Order[]> {
  try {
    const result = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.restaurant_id, restaurantId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return result.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Restaurant orders retrieval failed:', error);
    throw error;
  }
}

export async function addOrderItem(input: CreateOrderItemInput): Promise<OrderItem> {
  try {
    // Validate order exists
    const order = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (order.length === 0) {
      throw new Error('Order not found');
    }

    // Validate menu item exists
    const menuItem = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, input.menu_item_id))
      .execute();

    if (menuItem.length === 0) {
      throw new Error('Menu item not found');
    }

    // Calculate total price
    const totalPrice = input.unit_price * input.quantity;

    // Insert order item
    const result = await db.insert(orderItemsTable)
      .values({
        order_id: input.order_id,
        menu_item_id: input.menu_item_id,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        total_price: totalPrice.toString(), // Convert number to string for numeric column
        special_instructions: input.special_instructions
      })
      .returning()
      .execute();

    // Update order total amount
    const currentTotal = parseFloat(order[0].total_amount);
    const newTotal = currentTotal + totalPrice;

    await db.update(ordersTable)
      .set({
        total_amount: newTotal.toString() // Convert number to string for numeric column
      })
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    const orderItem = result[0];
    return {
      ...orderItem,
      unit_price: parseFloat(orderItem.unit_price), // Convert string back to number
      total_price: parseFloat(orderItem.total_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Order item creation failed:', error);
    throw error;
  }
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  try {
    const result = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, orderId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return result.map(orderItem => ({
      ...orderItem,
      unit_price: parseFloat(orderItem.unit_price), // Convert string back to number
      total_price: parseFloat(orderItem.total_price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Order items retrieval failed:', error);
    throw error;
  }
}

export async function removeOrderItem(orderItemId: number, orderId: number): Promise<boolean> {
  try {
    // Get the order item to be removed (for total calculation)
    const orderItem = await db.select()
      .from(orderItemsTable)
      .where(and(
        eq(orderItemsTable.id, orderItemId),
        eq(orderItemsTable.order_id, orderId)
      ))
      .execute();

    if (orderItem.length === 0) {
      return false; // Order item not found or doesn't belong to the order
    }

    // Get current order total
    const order = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .execute();

    if (order.length === 0) {
      return false; // Order not found
    }

    // Remove the order item
    await db.delete(orderItemsTable)
      .where(and(
        eq(orderItemsTable.id, orderItemId),
        eq(orderItemsTable.order_id, orderId)
      ))
      .execute();

    // Update order total amount
    const currentTotal = parseFloat(order[0].total_amount);
    const itemTotal = parseFloat(orderItem[0].total_price);
    const newTotal = currentTotal - itemTotal;

    await db.update(ordersTable)
      .set({
        total_amount: Math.max(0, newTotal).toString() // Ensure total doesn't go negative
      })
      .where(eq(ordersTable.id, orderId))
      .execute();

    return true;
  } catch (error) {
    console.error('Order item removal failed:', error);
    throw error;
  }
}