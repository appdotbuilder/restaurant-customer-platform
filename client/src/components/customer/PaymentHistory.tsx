import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Users
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Payment, 
  PaymentStatus
} from '../../../../server/src/schema';

interface PaymentHistoryProps {
  user: User;
}

export function PaymentHistory({ user }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');

  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUserPayments.query({ userId: user.id });
      setPayments(result);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setError('Failed to load your payment history');
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Filter payments based on status
  const filteredPayments = payments.filter((payment: Payment) => {
    if (statusFilter === 'all') return true;
    return payment.status === statusFilter;
  });

  // Sort payments by creation date (most recent first)
  const sortedPayments = filteredPayments.sort((a: Payment, b: Payment) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'refunded':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'reservation':
        return <Users className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // Calculate statistics
  const totalSpent = payments
    .filter((p: Payment) => p.status === 'completed')
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  const thisMonthSpent = payments
    .filter((p: Payment) => {
      const thisMonth = new Date();
      const paymentMonth = new Date(p.created_at);
      return paymentMonth.getMonth() === thisMonth.getMonth() && 
             paymentMonth.getFullYear() === thisMonth.getFullYear() &&
             p.status === 'completed';
    })
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  const pendingAmount = payments
    .filter((p: Payment) => ['pending', 'processing'].includes(p.status))
    .reduce((sum: number, p: Payment) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your payment history...</p>
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
          <h2 className="text-2xl font-bold">Payment History</h2>
          <p className="text-gray-600">View your transaction history and payment details</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: PaymentStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">${thisMonthSpent.toFixed(2)}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-purple-600">{payments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      {sortedPayments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
            <p className="text-gray-600">
              {statusFilter === 'all' 
                ? "You haven't made any payments yet."
                : `No ${statusFilter} payments found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPayments.map((payment: Payment) => (
            <Card key={payment.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1 capitalize">{payment.status}</span>
                      </Badge>
                      <div className="flex items-center">
                        {getPaymentTypeIcon(payment.type)}
                        <span className="ml-1 text-sm text-gray-600 capitalize">{payment.type} Payment</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-green-600 text-xl">
                        {payment.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Payment ID: </span>
                        <span className="text-gray-600">{payment.id}</span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">Payment Method: </span>
                        <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                      </div>
                      
                      {payment.transaction_id && (
                        <div className="text-sm">
                          <span className="font-medium">Transaction ID: </span>
                          <span className="text-gray-600 font-mono text-xs">{payment.transaction_id}</span>
                        </div>
                      )}

                      {payment.order_id && (
                        <div className="text-sm">
                          <span className="font-medium">Order ID: </span>
                          <span className="text-gray-600">{payment.order_id}</span>
                        </div>
                      )}

                      {payment.reservation_id && (
                        <div className="text-sm">
                          <span className="font-medium">Reservation ID: </span>
                          <span className="text-gray-600">{payment.reservation_id}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Date: </span>
                        <span>{payment.created_at.toLocaleDateString()} at {payment.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {payment.updated_at.getTime() !== payment.created_at.getTime() && (
                        <div className="text-sm">
                          <span className="font-medium">Last Updated: </span>
                          <span>{payment.updated_at.toLocaleDateString()} at {payment.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status-based Messages */}
                  {payment.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Your payment is being processed. This may take a few moments.
                      </p>
                    </div>
                  )}
                  
                  {payment.status === 'processing' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <RefreshCw className="h-4 w-4 inline mr-1" />
                        Payment is currently being processed by our payment provider.
                      </p>
                    </div>
                  )}
                  
                  {payment.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Payment completed successfully. Thank you!
                      </p>
                    </div>
                  )}
                  
                  {payment.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        Payment failed. Please contact support if you were charged.
                      </p>
                    </div>
                  )}
                  
                  {payment.status === 'refunded' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <p className="text-sm text-gray-800">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        This payment has been refunded. Please allow 3-5 business days for the refund to appear in your account.
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