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
  User,
  MapPin,
  DollarSign,
  Package
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Restaurant, 
  Order, 
  OrderItem,
  OrderStatus,
  UpdateOrderInput 
} from '../../../../server/src/schema';

interface OrderManagementProps {
  restaurant: Restaurant;
}

export function OrderManagement({ restaurant }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<{ [key: number]: OrderItem[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getRestaurantOrders.query({ restaurantId: restaurant.id });
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
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const updateData: UpdateOrderInput = {
        id: orderId,
        status
      };

      await trpc.updateOrder.mutate(updateData);
      setSuccess(`Order ${status} successfully!`);
      loadOrders();
    } catch (error: any) {
      setError(error.message || 'Failed to update order');
    }
  };

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

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const statusFlow: { [key in OrderStatus]: OrderStatus | null } = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: null,
      cancelled: null
    };
    return statusFlow[currentStatus];
  };

  const getNextStatusLabel = (currentStatus: OrderStatus): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return '';
    
    const labels: { [key in OrderStatus]: string } = {
      pending: 'Confirm',
      confirmed: 'Start Preparing',
      preparing: 'Mark Ready',
      ready: 'Mark Delivered',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[nextStatus];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-gray-600">Manage orders for {restaurant.name}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: OrderStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-2xl font-bold text-green-600">
                  ${orders.filter((o: Order) => {
                    const today = new Date().toDateString();
                    return new Date(o.created_at).toDateString() === today && o.status === 'delivered';
                  }).reduce((sum: number, o: Order) => sum + o.total_amount, 0).toFixed(2)}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'No orders found for this restaurant.' 
                : `No ${statusFilter} orders found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order: Order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Order #{order.id}
                      </span>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-600">
                          {order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">Customer ID: {order.customer_id}</span>
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
                        
                        {orderItems[order.id] && (
                          <div className="space-y-1">
                            <span className="text-sm font-medium">Items:</span>
                            <div className="text-sm space-y-1">
                              {orderItems[order.id].map((item: OrderItem) => (
                                <div key={item.id} className="flex justify-between">
                                  <span>{item.quantity}x Item #{item.menu_item_id}</span>
                                  <span>${item.total_price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    {getNextStatus(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const nextStatus = getNextStatus(order.status);
                          if (nextStatus) {
                            updateOrderStatus(order.id, nextStatus);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {getStatusIcon(getNextStatus(order.status)!)}
                        <span className="ml-1">{getNextStatusLabel(order.status)}</span>
                      </Button>
                    )}

                    {['pending', 'confirmed'].includes(order.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}