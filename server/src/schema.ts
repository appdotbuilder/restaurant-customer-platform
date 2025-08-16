import { z } from 'zod';

// User schemas (both customers and restaurant partners)
export const userRoleSchema = z.enum(['customer', 'partner']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Login schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Restaurant schemas
export const restaurantSchema = z.object({
  id: z.number(),
  partner_id: z.number(), // Foreign key to users table
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  opening_hours: z.string(), // JSON string with hours for each day
  cuisine_type: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Restaurant = z.infer<typeof restaurantSchema>;

export const createRestaurantInputSchema = z.object({
  partner_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  opening_hours: z.string(),
  cuisine_type: z.string().nullable()
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantInputSchema>;

export const updateRestaurantInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().nullable().optional(),
  opening_hours: z.string().optional(),
  cuisine_type: z.string().nullable().optional()
});

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantInputSchema>;

// Menu item schemas
export const menuItemSchema = z.object({
  id: z.number(),
  restaurant_id: z.number(), // Foreign key to restaurants table
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  category: z.string().nullable(),
  is_available: z.boolean(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MenuItem = z.infer<typeof menuItemSchema>;

export const createMenuItemInputSchema = z.object({
  restaurant_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  category: z.string().nullable(),
  is_available: z.boolean().default(true),
  image_url: z.string().nullable()
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const updateMenuItemInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  category: z.string().nullable().optional(),
  is_available: z.boolean().optional(),
  image_url: z.string().nullable().optional()
});

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;

// Reservation schemas
export const reservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const reservationSchema = z.object({
  id: z.number(),
  customer_id: z.number(), // Foreign key to users table
  restaurant_id: z.number(), // Foreign key to restaurants table
  reservation_date: z.coerce.date(),
  party_size: z.number().int().positive(),
  status: reservationStatusSchema,
  special_requests: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Reservation = z.infer<typeof reservationSchema>;

export const createReservationInputSchema = z.object({
  customer_id: z.number(),
  restaurant_id: z.number(),
  reservation_date: z.coerce.date(),
  party_size: z.number().int().positive(),
  special_requests: z.string().nullable()
});

export type CreateReservationInput = z.infer<typeof createReservationInputSchema>;

export const updateReservationInputSchema = z.object({
  id: z.number(),
  status: reservationStatusSchema.optional(),
  special_requests: z.string().nullable().optional()
});

export type UpdateReservationInput = z.infer<typeof updateReservationInputSchema>;

// Order schemas
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderSchema = z.object({
  id: z.number(),
  customer_id: z.number(), // Foreign key to users table
  restaurant_id: z.number(), // Foreign key to restaurants table
  status: orderStatusSchema,
  total_amount: z.number(),
  delivery_address: z.string().nullable(),
  special_instructions: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderInputSchema = z.object({
  customer_id: z.number(),
  restaurant_id: z.number(),
  delivery_address: z.string().nullable(),
  special_instructions: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema.optional(),
  delivery_address: z.string().nullable().optional(),
  special_instructions: z.string().nullable().optional()
});

export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;

// Order item schemas
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(), // Foreign key to orders table
  menu_item_id: z.number(), // Foreign key to menu_items table
  quantity: z.number().int().positive(),
  unit_price: z.number(),
  total_price: z.number(),
  special_instructions: z.string().nullable()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const createOrderItemInputSchema = z.object({
  order_id: z.number(),
  menu_item_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  special_instructions: z.string().nullable()
});

export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

// Payment schemas
export const paymentStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']);
export const paymentTypeSchema = z.enum(['order', 'reservation']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentType = z.infer<typeof paymentTypeSchema>;

export const paymentSchema = z.object({
  id: z.number(),
  user_id: z.number(), // Foreign key to users table
  order_id: z.number().nullable(), // Foreign key to orders table (for order payments)
  reservation_id: z.number().nullable(), // Foreign key to reservations table (for reservation payments)
  type: paymentTypeSchema,
  amount: z.number(),
  status: paymentStatusSchema,
  payment_method: z.string(), // e.g., 'credit_card', 'paypal', etc.
  transaction_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  user_id: z.number(),
  order_id: z.number().nullable(),
  reservation_id: z.number().nullable(),
  type: paymentTypeSchema,
  amount: z.number().positive(),
  payment_method: z.string()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

export const updatePaymentInputSchema = z.object({
  id: z.number(),
  status: paymentStatusSchema.optional(),
  transaction_id: z.string().nullable().optional()
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentInputSchema>;