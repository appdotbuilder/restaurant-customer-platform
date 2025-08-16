import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChefHat, 
  LogOut, 
  Store, 
  Utensils, 
  Calendar, 
  CreditCard, 
  Plus,
  Settings,
  TrendingUp
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { RestaurantProfile } from '@/components/partner/RestaurantProfile';
import { MenuManagement } from '@/components/partner/MenuManagement';
import { ReservationManagement } from '@/components/partner/ReservationManagement';
import { PaymentTracking } from '@/components/partner/PaymentTracking';
import { OrderManagement } from '@/components/partner/OrderManagement';
import type { User, Restaurant } from '../../../server/src/schema';

interface PartnerAppProps {
  user: User;
  onLogout: () => void;
}

export function PartnerApp({ user, onLogout }: PartnerAppProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadRestaurants = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getPartnerRestaurants.query({ partnerId: user.id });
      setRestaurants(result);
      if (result.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(result[0]);
      }
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, selectedRestaurant]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
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
              <div className="bg-orange-500 p-2 rounded-lg">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FlavorHub Partner</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.first_name}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {selectedRestaurant && (
                <div className="flex items-center space-x-2">
                  <Store className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{selectedRestaurant.name}</span>
                </div>
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
        {restaurants.length === 0 ? (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Restaurant Profile</h3>
            <p className="text-gray-600 mb-6">Create your restaurant profile to start managing your business.</p>
            <Button onClick={() => setActiveTab('profile')} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Restaurant Profile
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Restaurant
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Reservations
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <DashboardOverview restaurant={selectedRestaurant} />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <RestaurantProfile 
                user={user} 
                restaurants={restaurants}
                selectedRestaurant={selectedRestaurant}
                onRestaurantUpdate={loadRestaurants}
                onRestaurantSelect={setSelectedRestaurant}
              />
            </TabsContent>

            <TabsContent value="menu" className="mt-6">
              {selectedRestaurant ? (
                <MenuManagement restaurant={selectedRestaurant} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Please select a restaurant to manage its menu.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              {selectedRestaurant ? (
                <OrderManagement restaurant={selectedRestaurant} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Please select a restaurant to manage orders.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reservations" className="mt-6">
              {selectedRestaurant ? (
                <ReservationManagement restaurant={selectedRestaurant} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Please select a restaurant to manage reservations.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <PaymentTracking user={user} restaurant={selectedRestaurant} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function DashboardOverview({ restaurant }: { restaurant: Restaurant | null }) {
  if (!restaurant) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 text-center">Select a restaurant to view dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restaurant</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{restaurant.name}</div>
          <p className="text-xs text-muted-foreground">
            {restaurant.cuisine_type || 'Restaurant'}
          </p>
          <Badge variant="secondary" className="mt-2">Active</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">+2 from yesterday</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reservations</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8</div>
          <p className="text-xs text-muted-foreground">Today's bookings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$1,245</div>
          <p className="text-xs text-muted-foreground">Today's earnings</p>
        </CardContent>
      </Card>
    </div>
  );
}