import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  Utensils, 
  Star,
  Calendar,
  Users,
  ShoppingCart,
  Plus,
  Minus
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { RestaurantMenu } from '@/components/customer/RestaurantMenu';
import type { 
  User,
  Restaurant,
  CreateReservationInput
} from '../../../../server/src/schema';

interface RestaurantBrowserProps {
  restaurants: Restaurant[];
  searchQuery: string;
  user: User;
  onCartUpdate: (itemCount: number) => void;
}

export function RestaurantBrowser({ restaurants, searchQuery, user, onCartUpdate }: RestaurantBrowserProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reservationData, setReservationData] = useState<Omit<CreateReservationInput, 'customer_id' | 'restaurant_id'>>({
    reservation_date: new Date(),
    party_size: 2,
    special_requests: null
  });

  const makeReservation = async (restaurant: Restaurant) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const reservationInput: CreateReservationInput = {
        customer_id: user.id,
        restaurant_id: restaurant.id,
        ...reservationData
      };

      await trpc.createReservation.mutate(reservationInput);
      setSuccess('Reservation created successfully!');
      setShowReservationDialog(false);
      
      // Reset form
      setReservationData({
        reservation_date: new Date(),
        party_size: 2,
        special_requests: null
      });
    } catch (error: any) {
      setError(error.message || 'Failed to make reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const openReservationDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowReservationDialog(true);
    setError(null);
    setSuccess(null);
  };

  const openMenuDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowMenuDialog(true);
    setError(null);
    setSuccess(null);
  };

  // Parse opening hours for display
  const parseOpeningHours = (hoursString: string) => {
    try {
      return JSON.parse(hoursString);
    } catch {
      return {};
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

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

      {/* Restaurants Grid */}
      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Restaurants Found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No restaurants match "${searchQuery}". Try a different search term.`
                : 'No restaurants available at the moment.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant: Restaurant) => (
            <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">{restaurant.name}</h3>
                      {restaurant.cuisine_type && (
                        <Badge variant="secondary">{restaurant.cuisine_type}</Badge>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm">4.5</span>
                    </div>
                  </div>

                  {restaurant.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">{restaurant.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="line-clamp-1">{restaurant.address}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{restaurant.phone}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Open today</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button 
                      onClick={() => openMenuDialog(restaurant)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Utensils className="h-4 w-4 mr-2" />
                      View Menu
                    </Button>
                    <Button 
                      onClick={() => openReservationDialog(restaurant)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Reserve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reservation Dialog */}
      <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Make Reservation at {selectedRestaurant?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reservation_date">Date & Time</Label>
              <Input
                id="reservation_date"
                type="datetime-local"
                value={formatDateTime(reservationData.reservation_date)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReservationData(prev => ({ 
                    ...prev, 
                    reservation_date: new Date(e.target.value) 
                  }))
                }
                min={formatDateTime(new Date())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="party_size">Party Size</Label>
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReservationData(prev => ({ 
                    ...prev, 
                    party_size: Math.max(1, prev.party_size - 1) 
                  }))}
                  disabled={reservationData.party_size <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">
                  {reservationData.party_size}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReservationData(prev => ({ 
                    ...prev, 
                    party_size: Math.min(20, prev.party_size + 1) 
                  }))}
                  disabled={reservationData.party_size >= 20}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests (Optional)</Label>
              <Textarea
                id="special_requests"
                value={reservationData.special_requests || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setReservationData(prev => ({ 
                    ...prev, 
                    special_requests: e.target.value || null 
                  }))
                }
                placeholder="Any dietary restrictions, accessibility needs, or special occasions..."
                rows={3}
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                onClick={() => selectedRestaurant && makeReservation(selectedRestaurant)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Make Reservation'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReservationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRestaurant?.name} Menu
            </DialogTitle>
          </DialogHeader>
          
          {selectedRestaurant && (
            <RestaurantMenu 
              restaurant={selectedRestaurant} 
              user={user}
              onCartUpdate={onCartUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}