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
  User,
  Phone,
  Mail
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Restaurant, 
  Reservation, 
  ReservationStatus,
  UpdateReservationInput 
} from '../../../../server/src/schema';

interface ReservationManagementProps {
  restaurant: Restaurant;
}

export function ReservationManagement({ restaurant }: ReservationManagementProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');

  const loadReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getRestaurantReservations.query({ restaurantId: restaurant.id });
      setReservations(result);
    } catch (error) {
      console.error('Failed to load reservations:', error);
      setError('Failed to load reservations');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const updateReservationStatus = async (reservationId: number, status: ReservationStatus) => {
    try {
      const updateData: UpdateReservationInput = {
        id: reservationId,
        status
      };

      await trpc.updateReservation.mutate(updateData);
      setSuccess(`Reservation ${status} successfully!`);
      loadReservations();
    } catch (error: any) {
      setError(error.message || 'Failed to update reservation');
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reservations...</p>
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
          <h2 className="text-2xl font-bold">Reservation Management</h2>
          <p className="text-gray-600">Manage reservations for {restaurant.name}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: ReservationStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Total</p>
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {reservations.filter((r: Reservation) => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {reservations.filter((r: Reservation) => r.status === 'confirmed').length}
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
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reservations.filter((r: Reservation) => {
                    const today = new Date().toDateString();
                    return new Date(r.reservation_date).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      {sortedReservations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reservations</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? 'No reservations found for this restaurant.' 
                : `No ${statusFilter} reservations found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedReservations.map((reservation: Reservation) => (
            <Card key={reservation.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(reservation.status)}>
                        {getStatusIcon(reservation.status)}
                        <span className="ml-1 capitalize">{reservation.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-500">
                        ID: {reservation.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">
                            {new Date(reservation.reservation_date).toLocaleDateString()} at{' '}
                            {new Date(reservation.reservation_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">Party of {reservation.party_size}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm">Customer ID: {reservation.customer_id}</span>
                        </div>
                        
                        {reservation.special_requests && (
                          <div className="text-sm">
                            <span className="font-medium">Special Requests: </span>
                            <span className="text-gray-600">{reservation.special_requests}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {reservation.created_at.toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {reservation.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        size="sm"
                        onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {reservation.status === 'confirmed' && (
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        size="sm"
                        onClick={() => updateReservationStatus(reservation.id, 'completed')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
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