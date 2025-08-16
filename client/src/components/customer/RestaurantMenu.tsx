import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  DollarSign, 
  Utensils,
  Image as ImageIcon
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User,
  Restaurant,
  MenuItem,
  CreateOrderInput,
  CreateOrderItemInput
} from '../../../../server/src/schema';

interface RestaurantMenuProps {
  restaurant: Restaurant;
  user: User;
  onCartUpdate: (itemCount: number) => void;
}

interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}

export function RestaurantMenu({ restaurant, user, onCartUpdate }: RestaurantMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMenuItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await trpc.getMenuItems.query({ restaurantId: restaurant.id });
      // Only show available items
      setMenuItems(items.filter((item: MenuItem) => item.is_available));
    } catch (error) {
      console.error('Failed to load menu items:', error);
      setError('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  useEffect(() => {
    // Update cart count in parent
    const totalItems = cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
    onCartUpdate(totalItems);
  }, [cart, onCartUpdate]);

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existingItem = prev.find((item: CartItem) => item.id === menuItem.id);
      if (existingItem) {
        return prev.map((item: CartItem) => 
          item.id === menuItem.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...menuItem, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(prev => {
      const existingItem = prev.find((item: CartItem) => item.id === menuItemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map((item: CartItem) => 
          item.id === menuItemId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter((item: CartItem) => item.id !== menuItemId);
      }
    });
  };

  const updateSpecialInstructions = (menuItemId: number, instructions: string) => {
    setCart(prev => prev.map((item: CartItem) => 
      item.id === menuItemId 
        ? { ...item, special_instructions: instructions || undefined }
        : item
    ));
  };

  const getItemQuantity = (menuItemId: number) => {
    const cartItem = cart.find((item: CartItem) => item.id === menuItemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const calculateTotal = () => {
    return cart.reduce((total: number, item: CartItem) => total + (item.price * item.quantity), 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Create the order
      const orderInput: CreateOrderInput = {
        customer_id: user.id,
        restaurant_id: restaurant.id,
        delivery_address: null, // Could be added as a form field
        special_instructions: null
      };

      const order = await trpc.createOrder.mutate(orderInput);

      // Add items to the order
      for (const cartItem of cart) {
        const orderItemInput: CreateOrderItemInput = {
          order_id: order.id,
          menu_item_id: cartItem.id,
          quantity: cartItem.quantity,
          unit_price: cartItem.price,
          special_instructions: cartItem.special_instructions || null
        };

        await trpc.addOrderItem.mutate(orderItemInput);
      }

      setSuccess('Order placed successfully!');
      setCart([]); // Clear cart
    } catch (error: any) {
      setError(error.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group menu items by category
  const groupedItems = menuItems.reduce((acc: { [key: string]: MenuItem[] }, item: MenuItem) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading menu...</p>
      </div>
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

      {/* Cart Summary */}
      {cart.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Your Order ({cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {cart.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="text-lg font-bold text-blue-800">Total:</span>
              <span className="text-lg font-bold text-blue-800">${calculateTotal().toFixed(2)}</span>
            </div>
            <Button
              onClick={placeOrder}
              disabled={isSubmitting}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Items</h3>
            <p className="text-gray-600">This restaurant doesn't have any available menu items at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Utensils className="h-5 w-5 mr-2" />
                {category}
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item: MenuItem) => {
                  const quantity = getItemQuantity(item.id);
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex space-x-4">
                          {item.image_url ? (
                            <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{item.name}</h4>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              {quantity === 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(item)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="font-semibold w-8 text-center">{quantity}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addToCart(item)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {quantity > 0 && (
                              <div className="mt-2">
                                <Input
                                  placeholder="Special instructions..."
                                  value={cart.find((cartItem: CartItem) => cartItem.id === item.id)?.special_instructions || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                    updateSpecialInstructions(item.id, e.target.value)
                                  }
                                  className="text-xs"
                                  size={undefined}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}