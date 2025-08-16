import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Save, X, Store, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Restaurant, 
  CreateRestaurantInput, 
  UpdateRestaurantInput 
} from '../../../../server/src/schema';

interface RestaurantProfileProps {
  user: User;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onRestaurantUpdate: () => void;
  onRestaurantSelect: (restaurant: Restaurant | null) => void;
}

export function RestaurantProfile({ 
  user, 
  restaurants, 
  selectedRestaurant,
  onRestaurantUpdate,
  onRestaurantSelect 
}: RestaurantProfileProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRestaurantInput>({
    partner_id: user.id,
    name: '',
    description: null,
    address: '',
    phone: '',
    email: null,
    opening_hours: JSON.stringify({
      monday: '9:00-22:00',
      tuesday: '9:00-22:00',
      wednesday: '9:00-22:00',
      thursday: '9:00-22:00',
      friday: '9:00-23:00',
      saturday: '9:00-23:00',
      sunday: '10:00-21:00'
    }),
    cuisine_type: null
  });

  const resetForm = (restaurant?: Restaurant) => {
    if (restaurant) {
      setFormData({
        partner_id: user.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        opening_hours: restaurant.opening_hours,
        cuisine_type: restaurant.cuisine_type
      });
    } else {
      setFormData({
        partner_id: user.id,
        name: '',
        description: null,
        address: '',
        phone: '',
        email: null,
        opening_hours: JSON.stringify({
          monday: '9:00-22:00',
          tuesday: '9:00-22:00',
          wednesday: '9:00-22:00',
          thursday: '9:00-22:00',
          friday: '9:00-23:00',
          saturday: '9:00-23:00',
          sunday: '10:00-21:00'
        }),
        cuisine_type: null
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newRestaurant = await trpc.createRestaurant.mutate(formData);
      setSuccess('Restaurant profile created successfully!');
      setIsCreating(false);
      resetForm();
      onRestaurantUpdate();
      onRestaurantSelect(newRestaurant);
    } catch (error: any) {
      setError(error.message || 'Failed to create restaurant profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: UpdateRestaurantInput = {
        id: selectedRestaurant.id,
        name: formData.name,
        description: formData.description,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        opening_hours: formData.opening_hours,
        cuisine_type: formData.cuisine_type
      };

      await trpc.updateRestaurant.mutate(updateData);
      setSuccess('Restaurant profile updated successfully!');
      setIsEditing(false);
      onRestaurantUpdate();
    } catch (error: any) {
      setError(error.message || 'Failed to update restaurant profile');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    if (selectedRestaurant) {
      resetForm(selectedRestaurant);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setError(null);
    setSuccess(null);
    resetForm();
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
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

      {/* Restaurant Selection */}
      {restaurants.length > 0 && !isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Select Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedRestaurant?.id.toString() || ''}
                onValueChange={(value) => {
                  const restaurant = restaurants.find((r: Restaurant) => r.id.toString() === value);
                  onRestaurantSelect(restaurant || null);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant: Restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={startCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Create Restaurant Profile' : 'Edit Restaurant Profile'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={isCreating ? handleCreate : handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRestaurantInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter restaurant name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuisine_type">Cuisine Type</Label>
                  <Input
                    id="cuisine_type"
                    value={formData.cuisine_type || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRestaurantInput) => ({ 
                        ...prev, 
                        cuisine_type: e.target.value || null 
                      }))
                    }
                    placeholder="e.g., Italian, Chinese, American"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateRestaurantInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                  placeholder="Describe your restaurant"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRestaurantInput) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Enter full address"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRestaurantInput) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="Restaurant phone number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRestaurantInput) => ({ 
                        ...prev, 
                        email: e.target.value || null 
                      }))
                    }
                    placeholder="Restaurant email"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : isCreating ? 'Create Restaurant' : 'Update Restaurant'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Restaurant Details Display */}
      {selectedRestaurant && !isEditing && !isCreating && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              {selectedRestaurant.name}
            </CardTitle>
            <Button onClick={startEditing} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRestaurant.description && (
              <p className="text-gray-700">{selectedRestaurant.description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm">{selectedRestaurant.address}</span>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm">{selectedRestaurant.phone}</span>
                </div>
                
                {selectedRestaurant.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm">{selectedRestaurant.email}</span>
                  </div>
                )}
                
                {selectedRestaurant.cuisine_type && (
                  <div className="flex items-center">
                    <span className="text-sm font-medium">Cuisine: </span>
                    <span className="text-sm ml-1">{selectedRestaurant.cuisine_type}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium">Opening Hours</span>
                </div>
                <div className="text-xs space-y-1 text-gray-600">
                  {Object.entries(parseOpeningHours(selectedRestaurant.opening_hours)).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize">{day}:</span>
                      <span>{String(hours)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t text-xs text-gray-500">
              <p>Created: {selectedRestaurant.created_at.toLocaleDateString()}</p>
              <p>Last updated: {selectedRestaurant.updated_at.toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Restaurant State */}
      {restaurants.length === 0 && !isCreating && (
        <Card>
          <CardContent className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Restaurant Profile</h3>
            <p className="text-gray-600 mb-6">Create your restaurant profile to start managing your business.</p>
            <Button onClick={startCreating} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Restaurant Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}