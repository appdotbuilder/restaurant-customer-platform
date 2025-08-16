import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Users, ChefHat, CreditCard } from 'lucide-react';
import { PartnerApp } from '@/components/PartnerApp';
import { CustomerApp } from '@/components/CustomerApp';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';

type AppMode = 'landing' | 'partner' | 'customer';
type AuthMode = 'login' | 'register';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      loadCurrentUser(parseInt(savedUserId));
    }
  }, []);

  const loadCurrentUser = async (userId: number) => {
    try {
      setIsLoading(true);
      const user = await trpc.getCurrentUser.query({ userId });
      if (user) {
        setCurrentUser(user);
        // Set app mode based on user role
        if (user.role === 'partner') {
          setAppMode('partner');
        } else {
          setAppMode('customer');
        }
      } else {
        localStorage.removeItem('userId');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('userId');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('userId', user.id.toString());
    setAppMode(user.role === 'partner' ? 'partner' : 'customer');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('userId');
    setAppMode('landing');
  };

  const handleAppModeSelect = (mode: AppMode) => {
    setAppMode(mode);
    setAuthMode('login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show the appropriate app
  if (currentUser) {
    if (appMode === 'partner') {
      return <PartnerApp user={currentUser} onLogout={handleLogout} />;
    }
    if (appMode === 'customer') {
      return <CustomerApp user={currentUser} onLogout={handleLogout} />;
    }
  }

  // Show auth forms if app mode is selected
  if (appMode === 'partner' || appMode === 'customer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-orange-500 p-3 rounded-full">
                {appMode === 'partner' ? (
                  <ChefHat className="h-8 w-8 text-white" />
                ) : (
                  <Utensils className="h-8 w-8 text-white" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              🍽️ FlavorHub
            </h1>
            <p className="text-gray-600 mt-2">
              {appMode === 'partner' ? 'Restaurant Partner Portal' : 'Customer Portal'}
            </p>
          </div>

          {authMode === 'login' ? (
            <LoginForm
              userRole={appMode === 'partner' ? 'partner' : 'customer'}
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setAuthMode('register')}
              onBack={() => setAppMode('landing')}
            />
          ) : (
            <RegisterForm
              userRole={appMode === 'partner' ? 'partner' : 'customer'}
              onRegisterSuccess={handleLoginSuccess}
              onSwitchToLogin={() => setAuthMode('login')}
              onBack={() => setAppMode('landing')}
            />
          )}
        </div>
      </div>
    );
  }

  // Landing page - app mode selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🍽️ FlavorHub
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connecting restaurants and customers through delicious experiences
          </p>
        </div>

        {/* App Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Partner App Card */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-orange-300">
            <CardHeader className="text-center">
              <div className="mx-auto bg-orange-500 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <ChefHat className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Restaurant Partners</CardTitle>
              <CardDescription className="text-lg">
                Manage your restaurant, menu, and customer interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-700">
                  <Utensils className="h-5 w-5 mr-3 text-orange-500" />
                  <span>Menu Management</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-3 text-orange-500" />
                  <span>Reservation Management</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <CreditCard className="h-5 w-5 mr-3 text-orange-500" />
                  <span>Payment Processing</span>
                </div>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => handleAppModeSelect('partner')}
              >
                Continue as Restaurant Partner
              </Button>
            </CardContent>
          </Card>

          {/* Customer App Card */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-blue-300">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-500 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <Utensils className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Customers</CardTitle>
              <CardDescription className="text-lg">
                Discover restaurants, order food, and make reservations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-700">
                  <Utensils className="h-5 w-5 mr-3 text-blue-500" />
                  <span>Browse Menus</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="h-5 w-5 mr-3 text-blue-500" />
                  <span>Make Reservations</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <CreditCard className="h-5 w-5 mr-3 text-blue-500" />
                  <span>Order & Pay Online</span>
                </div>
              </div>
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => handleAppModeSelect('customer')}
              >
                Continue as Customer
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>Built with ❤️ for amazing dining experiences</p>
        </div>
      </div>
    </div>
  );
}

export default App;