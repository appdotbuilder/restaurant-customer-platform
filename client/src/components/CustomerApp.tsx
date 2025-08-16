import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Utensils, 
  LogOut, 
  Search,
  Calendar, 
  ShoppingCart,
  CreditCard,
  User as UserIcon,
  MapPin,
  Star
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { RestaurantBrowser } from '@/components/customer/RestaurantBrowser';
import { OrderHistory } from '@/components/customer/OrderHistory';
import { ReservationHistory } from '@/components/customer/ReservationHistory';
import { PaymentHistory } from '@/components/customer/PaymentHistory';
import { ActiveCart } from '@/components/customer/ActiveCart';
import type { User, Restaurant } from '../../../server/src/schema';

interface CustomerAppProps {
  user: User;
  onLogout: () => void;
}

export function CustomerApp({ user, onLogout }: CustomerAppProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('restaurants');
  const [cartItemCount, setCartItemCount] = useState(0);

  const loadRestaurants = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getRestaurants.query();
      setRestaurants(result);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter((restaurant: Restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (restaurant.cuisine_type && restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
    restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding amazing restaurants for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Utensils className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FlavorHub</h1>
                <p className="text-sm text-gray-600">Welcome, {user.first_name}!</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search restaurants, cuisines, locations..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {cartItemCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('cart')}
                  className="relative"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </Button>
              )}
              
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="mt-6">
            <RestaurantBrowser 
              restaurants={filteredRestaurants}
              searchQuery={searchQuery}
              user={user}
              onCartUpdate={setCartItemCount}
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrderHistory user={user} />
          </TabsContent>

          <TabsContent value="reservations" className="mt-6">
            <ReservationHistory user={user} restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentHistory user={user} />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <CustomerProfile user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustomerProfile({ user }: { user: User }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-3 rounded-full">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{user.first_name} {user.last_name}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-gray-600">{user.phone}</p>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">Member since</p>
            <p className="font-medium">{user.created_at.toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2 text-gray-500" />
              <span>Total Orders</span>
            </div>
            <span className="font-semibold">5</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>Reservations Made</span>
            </div>
            <span className="font-semibold">3</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-2 text-gray-500" />
              <span>Favorite Restaurants</span>
            </div>
            <span className="font-semibold">2</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}