import { db } from '../db';
import { menuItemsTable, restaurantsTable } from '../db/schema';
import { type CreateMenuItemInput, type UpdateMenuItemInput, type MenuItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  try {
    // Verify restaurant exists
    const restaurant = await db.select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.id, input.restaurant_id))
      .execute();

    if (restaurant.length === 0) {
      throw new Error('Restaurant not found');
    }

    // Insert menu item record
    const result = await db.insert(menuItemsTable)
      .values({
        restaurant_id: input.restaurant_id,
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        category: input.category,
        is_available: input.is_available,
        image_url: input.image_url
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const menuItem = result[0];
    return {
      ...menuItem,
      price: parseFloat(menuItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item creation failed:', error);
    throw error;
  }
}

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem> {
  try {
    // Build update values object, only including provided fields
    const updateValues: any = {};
    
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.price !== undefined) updateValues.price = input.price.toString();
    if (input.category !== undefined) updateValues.category = input.category;
    if (input.is_available !== undefined) updateValues.is_available = input.is_available;
    if (input.image_url !== undefined) updateValues.image_url = input.image_url;

    // Add updated timestamp
    updateValues.updated_at = new Date();

    // Update menu item record
    const result = await db.update(menuItemsTable)
      .set(updateValues)
      .where(eq(menuItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Menu item not found');
    }

    // Convert numeric fields back to numbers before returning
    const menuItem = result[0];
    return {
      ...menuItem,
      price: parseFloat(menuItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item update failed:', error);
    throw error;
  }
}

export async function getMenuItem(id: number): Promise<MenuItem | null> {
  try {
    const result = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const menuItem = result[0];
    return {
      ...menuItem,
      price: parseFloat(menuItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Menu item fetch failed:', error);
    throw error;
  }
}

export async function getMenuItems(restaurantId: number): Promise<MenuItem[]> {
  try {
    const result = await db.select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.restaurant_id, restaurantId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return result.map(menuItem => ({
      ...menuItem,
      price: parseFloat(menuItem.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Menu items fetch failed:', error);
    throw error;
  }
}

export async function deleteMenuItem(id: number, restaurantId: number): Promise<boolean> {
  try {
    // Delete menu item with both ID and restaurant ID validation
    const result = await db.delete(menuItemsTable)
      .where(and(
        eq(menuItemsTable.id, id),
        eq(menuItemsTable.restaurant_id, restaurantId)
      ))
      .execute();

    // Return true if a record was deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Menu item deletion failed:', error);
    throw error;
  }
}