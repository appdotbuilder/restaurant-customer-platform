import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

// This is a placeholder component for the cart functionality
// In a real application, this would manage a persistent cart state
// that persists across different restaurant menus and manages checkout

export function ActiveCart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2" />
          Shopping Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-12">
        <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your Cart is Empty</h3>
        <p className="text-gray-600">
          Browse restaurant menus to add items to your cart.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Note: Cart functionality is integrated within each restaurant's menu for the best ordering experience.
        </p>
      </CardContent>
    </Card>
  );
}