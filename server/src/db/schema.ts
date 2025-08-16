import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'partner']);
export const reservationStatusEnum = pgEnum('reservation_status', ['pending', 'confirmed', 'cancelled', 'completed']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const paymentTypeEnum = pgEnum('payment_type', ['order', 'reservation']);

// Users table (both customers and restaurant partners)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurants table
export const restaurantsTable = pgTable('restaurants', {
  id: serial('id').primaryKey(),
  partner_id: integer('partner_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  opening_hours: text('opening_hours').notNull(), // JSON string with hours for each day
  cuisine_type: text('cuisine_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Menu items table
export const menuItemsTable = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  restaurant_id: integer('restaurant_id').references(() => restaurantsTable.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category'),
  is_available: boolean('is_available').notNull().default(true),
  image_url: text('image_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Reservations table
export const reservationsTable = pgTable('reservations', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => usersTable.id).notNull(),
  restaurant_id: integer('restaurant_id').references(() => restaurantsTable.id).notNull(),
  reservation_date: timestamp('reservation_date').notNull(),
  party_size: integer('party_size').notNull(),
  status: reservationStatusEnum('status').notNull().default('pending'),
  special_requests: text('special_requests'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').references(() => usersTable.id).notNull(),
  restaurant_id: integer('restaurant_id').references(() => restaurantsTable.id).notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  delivery_address: text('delivery_address'),
  special_instructions: text('special_instructions'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').references(() => ordersTable.id).notNull(),
  menu_item_id: integer('menu_item_id').references(() => menuItemsTable.id).notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  special_instructions: text('special_instructions'),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  order_id: integer('order_id').references(() => ordersTable.id),
  reservation_id: integer('reservation_id').references(() => reservationsTable.id),
  type: paymentTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  payment_method: text('payment_method').notNull(),
  transaction_id: text('transaction_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  restaurants: many(restaurantsTable),
  reservations: many(reservationsTable),
  orders: many(ordersTable),
  payments: many(paymentsTable),
}));

export const restaurantsRelations = relations(restaurantsTable, ({ one, many }) => ({
  partner: one(usersTable, {
    fields: [restaurantsTable.partner_id],
    references: [usersTable.id],
  }),
  menuItems: many(menuItemsTable),
  reservations: many(reservationsTable),
  orders: many(ordersTable),
}));

export const menuItemsRelations = relations(menuItemsTable, ({ one, many }) => ({
  restaurant: one(restaurantsTable, {
    fields: [menuItemsTable.restaurant_id],
    references: [restaurantsTable.id],
  }),
  orderItems: many(orderItemsTable),
}));

export const reservationsRelations = relations(reservationsTable, ({ one, many }) => ({
  customer: one(usersTable, {
    fields: [reservationsTable.customer_id],
    references: [usersTable.id],
  }),
  restaurant: one(restaurantsTable, {
    fields: [reservationsTable.restaurant_id],
    references: [restaurantsTable.id],
  }),
  payments: many(paymentsTable),
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(usersTable, {
    fields: [ordersTable.customer_id],
    references: [usersTable.id],
  }),
  restaurant: one(restaurantsTable, {
    fields: [ordersTable.restaurant_id],
    references: [restaurantsTable.id],
  }),
  orderItems: many(orderItemsTable),
  payments: many(paymentsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  menuItem: one(menuItemsTable, {
    fields: [orderItemsTable.menu_item_id],
    references: [menuItemsTable.id],
  }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.user_id],
    references: [usersTable.id],
  }),
  order: one(ordersTable, {
    fields: [paymentsTable.order_id],
    references: [ordersTable.id],
  }),
  reservation: one(reservationsTable, {
    fields: [paymentsTable.reservation_id],
    references: [reservationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Restaurant = typeof restaurantsTable.$inferSelect;
export type NewRestaurant = typeof restaurantsTable.$inferInsert;

export type MenuItem = typeof menuItemsTable.$inferSelect;
export type NewMenuItem = typeof menuItemsTable.$inferInsert;

export type Reservation = typeof reservationsTable.$inferSelect;
export type NewReservation = typeof reservationsTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  restaurants: restaurantsTable,
  menuItems: menuItemsTable,
  reservations: reservationsTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  payments: paymentsTable,
};