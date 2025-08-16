import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, restaurantsTable, menuItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput, type CreateOrderItemInput, type UpdateOrderInput } from '../schema';
import { createOrder, updateOrder, getOrder, getCustomerOrders, getRestaurantOrders, addOrderItem, getOrderItems, removeOrderItem } from '../handlers/orders';
import { eq } from 'drizzle-orm';

describe('Orders handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helpers
  const createTestUser = async (role: 'customer' | 'partner' = 'customer') => {
    // Generate unique email to avoid constraint violations
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const email = role === 'customer' 
      ? `customer${timestamp}${random}@test.com` 
      : `partner${timestamp}${random}@test.com`;
    
    const result = await db.insert(usersTable)
      .values({
        email: email,
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        phone: '+1234567890',
        role: role
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestRestaurant = async (partnerId: number) => {
    const result = await db.insert(restaurantsTable)
      .values({
        partner_id: partnerId,
        name: 'Test Restaurant',
        description: 'A test restaurant',
        address: '123 Test St',
        phone: '+1987654321',
        email: 'restaurant@test.com',
        opening_hours: '{"mon": "9-17", "tue": "9-17"}',
        cuisine_type: 'Italian'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestMenuItem = async (restaurantId: number) => {
    const result = await db.insert(menuItemsTable)
      .values({
        restaurant_id: restaurantId,
        name: 'Test Pizza',
        description: 'Delicious test pizza',
        price: '15.99',
        category: 'Main',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();
    return result[0];
  };

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const input: CreateOrderInput = {
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: '456 Customer St',
        special_instructions: 'Ring the doorbell'
      };

      const result = await createOrder(input);

      expect(result.customer_id).toEqual(customer.id);
      expect(result.restaurant_id).toEqual(restaurant.id);
      expect(result.status).toEqual('pending');
      expect(result.total_amount).toEqual(0);
      expect(result.delivery_address).toEqual('456 Customer St');
      expect(result.special_instructions).toEqual('Ring the doorbell');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save order to database', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const input: CreateOrderInput = {
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      };

      const result = await createOrder(input);

      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, result.id))
        .execute();

      expect(orders).toHaveLength(1);
      expect(orders[0].customer_id).toEqual(customer.id);
      expect(orders[0].restaurant_id).toEqual(restaurant.id);
      expect(orders[0].status).toEqual('pending');
      expect(parseFloat(orders[0].total_amount)).toEqual(0);
    });

    it('should throw error for non-existent customer', async () => {
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const input: CreateOrderInput = {
        customer_id: 999,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      };

      await expect(createOrder(input)).rejects.toThrow(/customer not found/i);
    });

    it('should throw error for non-existent restaurant', async () => {
      const customer = await createTestUser('customer');

      const input: CreateOrderInput = {
        customer_id: customer.id,
        restaurant_id: 999,
        delivery_address: null,
        special_instructions: null
      };

      await expect(createOrder(input)).rejects.toThrow(/restaurant not found/i);
    });
  });

  describe('updateOrder', () => {
    it('should update order status', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const updateInput: UpdateOrderInput = {
        id: order.id,
        status: 'confirmed'
      };

      const result = await updateOrder(updateInput);

      expect(result.id).toEqual(order.id);
      expect(result.status).toEqual('confirmed');
      expect(result.customer_id).toEqual(customer.id);
    });

    it('should update delivery address and special instructions', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const updateInput: UpdateOrderInput = {
        id: order.id,
        delivery_address: '789 New Address',
        special_instructions: 'Leave at door'
      };

      const result = await updateOrder(updateInput);

      expect(result.delivery_address).toEqual('789 New Address');
      expect(result.special_instructions).toEqual('Leave at door');
    });

    it('should throw error for non-existent order', async () => {
      const updateInput: UpdateOrderInput = {
        id: 999,
        status: 'confirmed'
      };

      await expect(updateOrder(updateInput)).rejects.toThrow(/order not found/i);
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by id', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: '123 Test St',
        special_instructions: 'Test instructions'
      });

      const result = await getOrder(order.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(order.id);
      expect(result!.customer_id).toEqual(customer.id);
      expect(result!.restaurant_id).toEqual(restaurant.id);
      expect(result!.delivery_address).toEqual('123 Test St');
      expect(typeof result!.total_amount).toBe('number');
    });

    it('should return null for non-existent order', async () => {
      const result = await getOrder(999);
      expect(result).toBeNull();
    });
  });

  describe('getCustomerOrders', () => {
    it('should retrieve all orders for a customer', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      // Create multiple orders for the customer
      await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: '456 Another St',
        special_instructions: 'Second order'
      });

      const result = await getCustomerOrders(customer.id);

      expect(result).toHaveLength(2);
      result.forEach(order => {
        expect(order.customer_id).toEqual(customer.id);
        expect(typeof order.total_amount).toBe('number');
      });
    });

    it('should return empty array for customer with no orders', async () => {
      const customer = await createTestUser('customer');
      const result = await getCustomerOrders(customer.id);
      expect(result).toEqual([]);
    });
  });

  describe('getRestaurantOrders', () => {
    it('should retrieve all orders for a restaurant', async () => {
      const customer1 = await createTestUser('customer');
      const customer2 = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      // Create orders from different customers to the same restaurant
      await createOrder({
        customer_id: customer1.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      await createOrder({
        customer_id: customer2.id,
        restaurant_id: restaurant.id,
        delivery_address: '789 Customer St',
        special_instructions: 'From customer 2'
      });

      const result = await getRestaurantOrders(restaurant.id);

      expect(result).toHaveLength(2);
      result.forEach(order => {
        expect(order.restaurant_id).toEqual(restaurant.id);
        expect(typeof order.total_amount).toBe('number');
      });
    });

    it('should return empty array for restaurant with no orders', async () => {
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const result = await getRestaurantOrders(restaurant.id);
      expect(result).toEqual([]);
    });
  });

  describe('addOrderItem', () => {
    it('should add item to order and update total', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const input: CreateOrderItemInput = {
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        unit_price: 15.99,
        special_instructions: 'Extra cheese'
      };

      const result = await addOrderItem(input);

      expect(result.order_id).toEqual(order.id);
      expect(result.menu_item_id).toEqual(menuItem.id);
      expect(result.quantity).toEqual(2);
      expect(result.unit_price).toEqual(15.99);
      expect(result.total_price).toEqual(31.98);
      expect(result.special_instructions).toEqual('Extra cheese');
      expect(typeof result.unit_price).toBe('number');
      expect(typeof result.total_price).toBe('number');
    });

    it('should update order total amount', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        unit_price: 15.99,
        special_instructions: null
      });

      const updatedOrder = await getOrder(order.id);
      expect(updatedOrder!.total_amount).toEqual(31.98);
    });

    it('should throw error for non-existent order', async () => {
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const input: CreateOrderItemInput = {
        order_id: 999,
        menu_item_id: menuItem.id,
        quantity: 1,
        unit_price: 15.99,
        special_instructions: null
      };

      await expect(addOrderItem(input)).rejects.toThrow(/order not found/i);
    });

    it('should throw error for non-existent menu item', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const input: CreateOrderItemInput = {
        order_id: order.id,
        menu_item_id: 999,
        quantity: 1,
        unit_price: 15.99,
        special_instructions: null
      };

      await expect(addOrderItem(input)).rejects.toThrow(/menu item not found/i);
    });
  });

  describe('getOrderItems', () => {
    it('should retrieve all items for an order', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem1 = await createTestMenuItem(restaurant.id);
      
      // Create second menu item
      const menuItem2 = await db.insert(menuItemsTable)
        .values({
          restaurant_id: restaurant.id,
          name: 'Test Pasta',
          description: 'Delicious test pasta',
          price: '12.99',
          category: 'Main',
          is_available: true,
          image_url: null
        })
        .returning()
        .execute();

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      // Add multiple items to the order
      await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem1.id,
        quantity: 2,
        unit_price: 15.99,
        special_instructions: null
      });

      await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem2[0].id,
        quantity: 1,
        unit_price: 12.99,
        special_instructions: 'No olives'
      });

      const result = await getOrderItems(order.id);

      expect(result).toHaveLength(2);
      result.forEach(item => {
        expect(item.order_id).toEqual(order.id);
        expect(typeof item.unit_price).toBe('number');
        expect(typeof item.total_price).toBe('number');
      });
    });

    it('should return empty array for order with no items', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const result = await getOrderItems(order.id);
      expect(result).toEqual([]);
    });
  });

  describe('removeOrderItem', () => {
    it('should remove item and update order total', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const orderItem = await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        unit_price: 15.99,
        special_instructions: null
      });

      const result = await removeOrderItem(orderItem.id, order.id);
      expect(result).toBe(true);

      // Verify item was removed
      const items = await getOrderItems(order.id);
      expect(items).toHaveLength(0);

      // Verify order total was updated
      const updatedOrder = await getOrder(order.id);
      expect(updatedOrder!.total_amount).toEqual(0);
    });

    it('should return false for non-existent order item', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const result = await removeOrderItem(999, order.id);
      expect(result).toBe(false);
    });

    it('should return false for item not belonging to the order', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const order1 = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const order2 = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      const orderItem = await addOrderItem({
        order_id: order1.id,
        menu_item_id: menuItem.id,
        quantity: 1,
        unit_price: 15.99,
        special_instructions: null
      });

      // Try to remove item from wrong order
      const result = await removeOrderItem(orderItem.id, order2.id);
      expect(result).toBe(false);
    });

    it('should handle multiple items correctly', async () => {
      const customer = await createTestUser('customer');
      const partner = await createTestUser('partner');
      const restaurant = await createTestRestaurant(partner.id);
      const menuItem = await createTestMenuItem(restaurant.id);

      const order = await createOrder({
        customer_id: customer.id,
        restaurant_id: restaurant.id,
        delivery_address: null,
        special_instructions: null
      });

      // Add two items
      const item1 = await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 1,
        unit_price: 15.99,
        special_instructions: null
      });

      const item2 = await addOrderItem({
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: 2,
        unit_price: 12.99,
        special_instructions: null
      });

      // Remove first item
      await removeOrderItem(item1.id, order.id);

      // Verify only second item remains and total is correct
      const items = await getOrderItems(order.id);
      expect(items).toHaveLength(1);
      expect(items[0].id).toEqual(item2.id);

      const updatedOrder = await getOrder(order.id);
      expect(updatedOrder!.total_amount).toEqual(25.98); // 2 * 12.99
    });
  });
});