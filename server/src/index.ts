import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  registerUserInputSchema,
  createRestaurantInputSchema,
  updateRestaurantInputSchema,
  createMenuItemInputSchema,
  updateMenuItemInputSchema,
  createReservationInputSchema,
  updateReservationInputSchema,
  createOrderInputSchema,
  updateOrderInputSchema,
  createOrderItemInputSchema,
  createPaymentInputSchema,
  updatePaymentInputSchema
} from './schema';

// Import handlers
import { loginUser, registerUser, getCurrentUser } from './handlers/auth';
import { 
  createRestaurant, 
  updateRestaurant, 
  getRestaurant, 
  getRestaurants, 
  getPartnerRestaurants, 
  deleteRestaurant 
} from './handlers/restaurants';
import {
  createMenuItem,
  updateMenuItem,
  getMenuItem,
  getMenuItems,
  deleteMenuItem
} from './handlers/menu_items';
import {
  createReservation,
  updateReservation,
  getReservation,
  getCustomerReservations,
  getRestaurantReservations,
  cancelReservation
} from './handlers/reservations';
import {
  createOrder,
  updateOrder,
  getOrder,
  getCustomerOrders,
  getRestaurantOrders,
  addOrderItem,
  getOrderItems,
  removeOrderItem
} from './handlers/orders';
import {
  createPayment,
  updatePayment,
  getPayment,
  getUserPayments,
  getOrderPayments,
  getReservationPayments,
  processPayment,
  refundPayment
} from './handlers/payments';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // Restaurant routes
  createRestaurant: publicProcedure
    .input(createRestaurantInputSchema)
    .mutation(({ input }) => createRestaurant(input)),

  updateRestaurant: publicProcedure
    .input(updateRestaurantInputSchema)
    .mutation(({ input }) => updateRestaurant(input)),

  getRestaurant: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getRestaurant(input.id)),

  getRestaurants: publicProcedure
    .query(() => getRestaurants()),

  getPartnerRestaurants: publicProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(({ input }) => getPartnerRestaurants(input.partnerId)),

  deleteRestaurant: publicProcedure
    .input(z.object({ id: z.number(), partnerId: z.number() }))
    .mutation(({ input }) => deleteRestaurant(input.id, input.partnerId)),

  // Menu item routes
  createMenuItem: publicProcedure
    .input(createMenuItemInputSchema)
    .mutation(({ input }) => createMenuItem(input)),

  updateMenuItem: publicProcedure
    .input(updateMenuItemInputSchema)
    .mutation(({ input }) => updateMenuItem(input)),

  getMenuItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMenuItem(input.id)),

  getMenuItems: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(({ input }) => getMenuItems(input.restaurantId)),

  deleteMenuItem: publicProcedure
    .input(z.object({ id: z.number(), restaurantId: z.number() }))
    .mutation(({ input }) => deleteMenuItem(input.id, input.restaurantId)),

  // Reservation routes
  createReservation: publicProcedure
    .input(createReservationInputSchema)
    .mutation(({ input }) => createReservation(input)),

  updateReservation: publicProcedure
    .input(updateReservationInputSchema)
    .mutation(({ input }) => updateReservation(input)),

  getReservation: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getReservation(input.id)),

  getCustomerReservations: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerReservations(input.customerId)),

  getRestaurantReservations: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(({ input }) => getRestaurantReservations(input.restaurantId)),

  cancelReservation: publicProcedure
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(({ input }) => cancelReservation(input.id, input.userId)),

  // Order routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  updateOrder: publicProcedure
    .input(updateOrderInputSchema)
    .mutation(({ input }) => updateOrder(input)),

  getOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrder(input.id)),

  getCustomerOrders: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerOrders(input.customerId)),

  getRestaurantOrders: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(({ input }) => getRestaurantOrders(input.restaurantId)),

  addOrderItem: publicProcedure
    .input(createOrderItemInputSchema)
    .mutation(({ input }) => addOrderItem(input)),

  getOrderItems: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderItems(input.orderId)),

  removeOrderItem: publicProcedure
    .input(z.object({ orderItemId: z.number(), orderId: z.number() }))
    .mutation(({ input }) => removeOrderItem(input.orderItemId, input.orderId)),

  // Payment routes
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  updatePayment: publicProcedure
    .input(updatePaymentInputSchema)
    .mutation(({ input }) => updatePayment(input)),

  getPayment: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPayment(input.id)),

  getUserPayments: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserPayments(input.userId)),

  getOrderPayments: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderPayments(input.orderId)),

  getReservationPayments: publicProcedure
    .input(z.object({ reservationId: z.number() }))
    .query(({ input }) => getReservationPayments(input.reservationId)),

  processPayment: publicProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(({ input }) => processPayment(input.paymentId)),

  refundPayment: publicProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(({ input }) => refundPayment(input.paymentId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();