import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menuItemsTable, restaurantsTable, usersTable } from '../db/schema';
import { type CreateMenuItemInput, type UpdateMenuItemInput } from '../schema';
import { 
  createMenuItem, 
  updateMenuItem, 
  getMenuItem, 
  getMenuItems, 
  deleteMenuItem 
} from '../handlers/menu_items';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'partner@test.com',
  password_hash: 'hashedpassword',
  first_name: 'John',
  last_name: 'Doe',
  phone: '555-1234',
  role: 'partner' as const
};

const testRestaurant = {
  name: 'Test Restaurant',
  description: 'A restaurant for testing',
  address: '123 Test St',
  phone: '555-0123',
  email: 'restaurant@test.com',
  opening_hours: '{"mon": "9-17", "tue": "9-17"}',
  cuisine_type: 'Italian'
};

const testMenuItemInput: CreateMenuItemInput = {
  restaurant_id: 1, // Will be updated with actual ID
  name: 'Test Pizza',
  description: 'Delicious test pizza',
  price: 15.99,
  category: 'Main Course',
  is_available: true,
  image_url: 'http://example.com/pizza.jpg'
};

describe('Menu Items Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let restaurantId: number;

  beforeEach(async () => {
    // Create a test user (partner)
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create a test restaurant
    const restaurantResult = await db.insert(restaurantsTable)
      .values({
        ...testRestaurant,
        partner_id: userId
      })
      .returning()
      .execute();
    
    restaurantId = restaurantResult[0].id;
  });

  describe('createMenuItem', () => {
    it('should create a menu item successfully', async () => {
      const input = { ...testMenuItemInput, restaurant_id: restaurantId };
      
      const result = await createMenuItem(input);

      // Verify response structure
      expect(result.name).toEqual('Test Pizza');
      expect(result.description).toEqual(input.description);
      expect(result.price).toEqual(15.99);
      expect(typeof result.price).toEqual('number');
      expect(result.category).toEqual('Main Course');
      expect(result.is_available).toEqual(true);
      expect(result.image_url).toEqual(input.image_url);
      expect(result.restaurant_id).toEqual(restaurantId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save menu item to database', async () => {
      const input = { ...testMenuItemInput, restaurant_id: restaurantId };
      
      const result = await createMenuItem(input);

      // Verify data was saved to database
      const menuItems = await db.select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, result.id))
        .execute();

      expect(menuItems).toHaveLength(1);
      expect(menuItems[0].name).toEqual('Test Pizza');
      expect(menuItems[0].description).toEqual(input.description);
      expect(parseFloat(menuItems[0].price)).toEqual(15.99);
      expect(menuItems[0].category).toEqual('Main Course');
      expect(menuItems[0].is_available).toEqual(true);
      expect(menuItems[0].restaurant_id).toEqual(restaurantId);
    });

    it('should handle menu item with minimal data', async () => {
      const minimalInput: CreateMenuItemInput = {
        restaurant_id: restaurantId,
        name: 'Simple Item',
        description: null,
        price: 5.50,
        category: null,
        is_available: true,
        image_url: null
      };

      const result = await createMenuItem(minimalInput);

      expect(result.name).toEqual('Simple Item');
      expect(result.description).toBeNull();
      expect(result.price).toEqual(5.50);
      expect(result.category).toBeNull();
      expect(result.image_url).toBeNull();
      expect(result.is_available).toEqual(true);
    });

    it('should throw error for non-existent restaurant', async () => {
      const input = { ...testMenuItemInput, restaurant_id: 999 };

      await expect(createMenuItem(input)).rejects.toThrow(/restaurant not found/i);
    });
  });

  describe('updateMenuItem', () => {
    let menuItemId: number;

    beforeEach(async () => {
      const input = { ...testMenuItemInput, restaurant_id: restaurantId };
      const menuItem = await createMenuItem(input);
      menuItemId = menuItem.id;
    });

    it('should update menu item successfully', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: menuItemId,
        name: 'Updated Pizza',
        price: 18.99,
        is_available: false
      };

      const result = await updateMenuItem(updateInput);

      expect(result.id).toEqual(menuItemId);
      expect(result.name).toEqual('Updated Pizza');
      expect(result.price).toEqual(18.99);
      expect(typeof result.price).toEqual('number');
      expect(result.is_available).toEqual(false);
      expect(result.description).toEqual(testMenuItemInput.description); // Unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update only provided fields', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: menuItemId,
        price: 12.50
      };

      const result = await updateMenuItem(updateInput);

      expect(result.price).toEqual(12.50);
      expect(result.name).toEqual(testMenuItemInput.name); // Unchanged
      expect(result.description).toEqual(testMenuItemInput.description); // Unchanged
    });

    it('should handle nullable field updates', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: menuItemId,
        description: null,
        category: null,
        image_url: null
      };

      const result = await updateMenuItem(updateInput);

      expect(result.description).toBeNull();
      expect(result.category).toBeNull();
      expect(result.image_url).toBeNull();
    });

    it('should throw error for non-existent menu item', async () => {
      const updateInput: UpdateMenuItemInput = {
        id: 999,
        name: 'Non-existent'
      };

      await expect(updateMenuItem(updateInput)).rejects.toThrow(/menu item not found/i);
    });
  });

  describe('getMenuItem', () => {
    let menuItemId: number;

    beforeEach(async () => {
      const input = { ...testMenuItemInput, restaurant_id: restaurantId };
      const menuItem = await createMenuItem(input);
      menuItemId = menuItem.id;
    });

    it('should fetch menu item by ID', async () => {
      const result = await getMenuItem(menuItemId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(menuItemId);
      expect(result!.name).toEqual('Test Pizza');
      expect(result!.price).toEqual(15.99);
      expect(typeof result!.price).toEqual('number');
      expect(result!.restaurant_id).toEqual(restaurantId);
    });

    it('should return null for non-existent menu item', async () => {
      const result = await getMenuItem(999);

      expect(result).toBeNull();
    });
  });

  describe('getMenuItems', () => {
    beforeEach(async () => {
      // Create multiple menu items for the restaurant
      const items = [
        { ...testMenuItemInput, name: 'Pizza', price: 15.99, restaurant_id: restaurantId },
        { ...testMenuItemInput, name: 'Pasta', price: 12.50, restaurant_id: restaurantId },
        { ...testMenuItemInput, name: 'Salad', price: 8.99, restaurant_id: restaurantId }
      ];

      for (const item of items) {
        await createMenuItem(item);
      }
    });

    it('should fetch all menu items for a restaurant', async () => {
      const result = await getMenuItems(restaurantId);

      expect(result).toHaveLength(3);
      expect(result[0].restaurant_id).toEqual(restaurantId);
      expect(result[1].restaurant_id).toEqual(restaurantId);
      expect(result[2].restaurant_id).toEqual(restaurantId);

      // Verify numeric conversion
      result.forEach(item => {
        expect(typeof item.price).toEqual('number');
      });

      // Verify we have the expected items
      const names = result.map(item => item.name).sort();
      expect(names).toEqual(['Pasta', 'Pizza', 'Salad']);
    });

    it('should return empty array for restaurant with no menu items', async () => {
      // Create another restaurant
      const userResult = await db.insert(usersTable)
        .values({ ...testUser, email: 'partner2@test.com' })
        .returning()
        .execute();
      
      const restaurantResult = await db.insert(restaurantsTable)
        .values({
          ...testRestaurant,
          partner_id: userResult[0].id,
          name: 'Empty Restaurant'
        })
        .returning()
        .execute();

      const result = await getMenuItems(restaurantResult[0].id);

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteMenuItem', () => {
    let menuItemId: number;

    beforeEach(async () => {
      const input = { ...testMenuItemInput, restaurant_id: restaurantId };
      const menuItem = await createMenuItem(input);
      menuItemId = menuItem.id;
    });

    it('should delete menu item successfully', async () => {
      const result = await deleteMenuItem(menuItemId, restaurantId);

      expect(result).toBe(true);

      // Verify item was deleted
      const menuItem = await getMenuItem(menuItemId);
      expect(menuItem).toBeNull();
    });

    it('should return false for non-existent menu item', async () => {
      const result = await deleteMenuItem(999, restaurantId);

      expect(result).toBe(false);
    });

    it('should return false when restaurant ID does not match', async () => {
      const result = await deleteMenuItem(menuItemId, 999);

      expect(result).toBe(false);

      // Verify item still exists
      const menuItem = await getMenuItem(menuItemId);
      expect(menuItem).not.toBeNull();
    });

    it('should validate restaurant ownership before deletion', async () => {
      // Create another restaurant
      const userResult = await db.insert(usersTable)
        .values({ ...testUser, email: 'partner2@test.com' })
        .returning()
        .execute();
      
      const restaurantResult = await db.insert(restaurantsTable)
        .values({
          ...testRestaurant,
          partner_id: userResult[0].id,
          name: 'Another Restaurant'
        })
        .returning()
        .execute();

      const otherRestaurantId = restaurantResult[0].id;

      // Try to delete menu item with wrong restaurant ID
      const result = await deleteMenuItem(menuItemId, otherRestaurantId);

      expect(result).toBe(false);

      // Verify item still exists
      const menuItem = await getMenuItem(menuItemId);
      expect(menuItem).not.toBeNull();
    });
  });
});