import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  Store,
  DollarSign,
  Package,
  MapPin
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Order, 
  OrderItem,
  OrderStatus
} from '../../../../server/src/schema';

interface OrderHistoryProps {
  user: User;
}

export function OrderHistory({ user }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: number]: OrderItem[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCustomerOrders.query({ customerId: user.id });
      setOrders(result);
      
      // Load order items for each order
      const itemsPromises = result.map((order: Order) => 
        trpc.getOrderItems.query({ orderId: order.id })
      );
      const itemsResults = await Promise.all(itemsPromises);
      
      const itemsMap: { [key: number]: OrderItem[] } = {};
      result.forEach((order: Order, index: number) => {
        itemsMap[order.id] = itemsResults[index];
      });
      setOrderItems(itemsMap);
      
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError('Failed to load your orders');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filter orders based on status
  const filteredOrders = orders.filter((order: Order) => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  // Sort orders by creation date (most recent first)
  const sortedOrders = filteredOrders.sort((a: Order, b: Order) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">My Orders</h2>
          <p className="text-gray-600">Track and manage your food orders</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter((o: Order) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">
                  ${orders.filter((o: Order) => o.status === 'delivered').reduce((sum: number, o: Order) => sum + o.total_amount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${orders.length > 0 ? (orders.reduce((sum: number, o: Order) => sum + o.total_amount, 0) / orders.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      {sortedOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? "You haven't placed any orders yet. Browse restaurants to get started!"
                : `No ${statusFilter} orders found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order: Order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Order #{order.id}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-600 text-lg">
                        {order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">Restaurant ID: {order.restaurant_id}</span>
                      </div>
                      
                      {order.delivery_address && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                          <span className="text-sm">{order.delivery_address}</span>
                        </div>
                      )}
                      
                      {order.special_instructions && (
                        <div className="text-sm">
                          <span className="font-medium">Instructions: </span>
                          <span className="text-gray-600">{order.special_instructions}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Ordered: </span>
                        <span>{order.created_at.toLocaleDateString()} at {order.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">Last Updated: </span>
                        <span>{order.updated_at.toLocaleDateString()} at {order.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {orderItems[order.id] && orderItems[order.id].length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Order Items:</h4>
                      <div className="space-y-2">
                        {orderItems[order.id].map((item: OrderItem) => (
                          <div key={item.id} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{item.quantity}x Menu Item #{item.menu_item_id}</span>
                              {item.special_instructions && (
                                <p className="text-gray-600 text-xs mt-1">
                                  Note: {item.special_instructions}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-medium">${item.total_price.toFixed(2)}</span>
                              <p className="text-xs text-gray-500">
                                ${item.unit_price.toFixed(2)} each
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status-based Messages */}
                  {order.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Your order is waiting for restaurant confirmation.
                      </p>
                    </div>
                  )}
                  
                  {order.status === 'preparing' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                      <p className="text-sm text-purple-800">
                        <Package className="h-4 w-4 inline mr-1" />
                        Your order is being prepared by the restaurant.
                      </p>
                    </div>
                  )}
                  
                  {order.status === 'ready' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Your order is ready for pickup or delivery!
                      </p>
                    </div>
                  )}
                  
                  {order.status === 'delivered' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                      <p className="text-sm text-emerald-800">
                        <Truck className="h-4 w-4 inline mr-1" />
                        Order delivered successfully. Enjoy your meal!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}