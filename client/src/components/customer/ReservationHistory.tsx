import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Store,
  MapPin
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Restaurant,
  Reservation, 
  ReservationStatus
} from '../../../../server/src/schema';

interface ReservationHistoryProps {
  user: User;
  restaurants: Restaurant[];
}

export function ReservationHistory({ user, restaurants }: ReservationHistoryProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');

  const loadReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCustomerReservations.query({ customerId: user.id });
      setReservations(result);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      setError('Failed to load your reservations');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const cancelReservation = async (reservationId: number) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      await trpc.cancelReservation.mutate({ id: reservationId, userId: user.id });
      setSuccess('Reservation cancelled successfully');
      loadReservations();
    } catch (error: any) {
      setError(error.message || 'Failed to cancel reservation');
    }
  };

  // Filter reservations based on status
  const filteredReservations = reservations.filter((reservation: Reservation) => {
    if (statusFilter === 'all') return true;
    return reservation.status === statusFilter;
  });

  // Sort reservations by date (most recent first)
  const sortedReservations = filteredReservations.sort((a: Reservation, b: Reservation) => 
    new Date(b.reservation_date).getTime() - new Date(a.reservation_date).getTime()
  );

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ReservationStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getRestaurantInfo = (restaurantId: number) => {
    return restaurants.find((r: Restaurant) => r.id === restaurantId);
  };

  const isUpcoming = (reservationDate: Date) => {
    return new Date(reservationDate) > new Date();
  };

  const canCancel = (reservation: Reservation) => {
    return reservation.status === 'pending' || 
           (reservation.status === 'confirmed' && isUpcoming(reservation.reservation_date));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your reservations...</p>
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
          <h2 className="text-2xl font-bold">My Reservations</h2>
          <p className="text-gray-600">View and manage your restaurant reservations</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: ReservationStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reservations</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Total Reservations</p>
                <p className="text-2xl font-bold">{reservations.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reservations.filter((r: Reservation) => 
                    ['pending', 'confirmed'].includes(r.status) && isUpcoming(r.reservation_date)
                  ).length}
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {reservations.filter((r: Reservation) => r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {reservations.filter((r: Reservation) => r.status === 'cancelled').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      {sortedReservations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reservations Found</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? "You haven't made any reservations yet. Browse restaurants to make your first reservation!"
                : `No ${statusFilter} reservations found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedReservations.map((reservation: Reservation) => {
            const restaurant = getRestaurantInfo(reservation.restaurant_id);
            const upcoming = isUpcoming(reservation.reservation_date);
            
            return (
              <Card key={reservation.id} className={upcoming ? 'border-blue-200' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(reservation.status)}>
                          {getStatusIcon(reservation.status)}
                          <span className="ml-1 capitalize">{reservation.status}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Reservation #{reservation.id}
                        </span>
                        {upcoming && reservation.status === 'confirmed' && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Store className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm font-medium">
                              {restaurant ? restaurant.name : `Restaurant ID: ${reservation.restaurant_id}`}
                            </span>
                          </div>
                          
                          {restaurant && (
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                              <span className="text-sm text-gray-600">{restaurant.address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">
                              {new Date(reservation.reservation_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">
                              {new Date(reservation.reservation_date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm">Party of {reservation.party_size}</span>
                          </div>
                          
                          {reservation.special_requests && (
                            <div className="text-sm">
                              <span className="font-medium">Special Requests: </span>
                              <span className="text-gray-600">{reservation.special_requests}</span>
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-500">
                            <span>Created: {reservation.created_at.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {canCancel(reservation) && (
                      <div className="flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelReservation(reservation.id)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel Reservation
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status-based Messages */}
                  {reservation.status === 'pending' && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Your reservation is awaiting confirmation from the restaurant.
                      </p>
                    </div>
                  )}
                  
                  {reservation.status === 'confirmed' && upcoming && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Your reservation is confirmed! We look forward to seeing you.
                      </p>
                    </div>
                  )}
                  
                  {reservation.status === 'completed' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Thank you for dining with us! Hope you enjoyed your experience.
                      </p>
                    </div>
                  )}
                  
                  {reservation.status === 'cancelled' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        This reservation has been cancelled.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}