import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Utensils, 
  DollarSign, 
  Image,
  Eye,
  EyeOff
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Restaurant, 
  MenuItem, 
  CreateMenuItemInput, 
  UpdateMenuItemInput 
} from '../../../../server/src/schema';

interface MenuManagementProps {
  restaurant: Restaurant;
}

export function MenuManagement({ restaurant }: MenuManagementProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateMenuItemInput>({
    restaurant_id: restaurant.id,
    name: '',
    description: null,
    price: 0,
    category: null,
    is_available: true,
    image_url: null
  });

  const loadMenuItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await trpc.getMenuItems.query({ restaurantId: restaurant.id });
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      setError('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const resetForm = (item?: MenuItem) => {
    if (item) {
      setFormData({
        restaurant_id: restaurant.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        is_available: item.is_available,
        image_url: item.image_url
      });
    } else {
      setFormData({
        restaurant_id: restaurant.id,
        name: '',
        description: null,
        price: 0,
        category: null,
        is_available: true,
        image_url: null
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.createMenuItem.mutate(formData);
      setSuccess('Menu item created successfully!');
      setIsCreating(false);
      resetForm();
      loadMenuItems();
    } catch (error: any) {
      setError(error.message || 'Failed to create menu item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: UpdateMenuItemInput = {
        id: editingItem.id,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        is_available: formData.is_available,
        image_url: formData.image_url
      };

      await trpc.updateMenuItem.mutate(updateData);
      setSuccess('Menu item updated successfully!');
      setEditingItem(null);
      resetForm();
      loadMenuItems();
    } catch (error: any) {
      setError(error.message || 'Failed to update menu item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await trpc.deleteMenuItem.mutate({ id: itemId, restaurantId: restaurant.id });
      setSuccess('Menu item deleted successfully!');
      loadMenuItems();
    } catch (error: any) {
      setError(error.message || 'Failed to delete menu item');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const updateData: UpdateMenuItemInput = {
        id: item.id,
        is_available: !item.is_available
      };

      await trpc.updateMenuItem.mutate(updateData);
      loadMenuItems();
    } catch (error: any) {
      setError(error.message || 'Failed to update availability');
    }
  };

  const startEditing = (item: MenuItem) => {
    setEditingItem(item);
    resetForm(item);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingItem(null);
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

  // Group menu items by category
  const groupedItems = menuItems.reduce((acc: { [key: string]: MenuItem[] }, item: MenuItem) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  if (isLoading && menuItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading menu items...</p>
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

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Menu Management</h2>
          <p className="text-gray-600">Manage menu items for {restaurant.name}</p>
        </div>
        <Button onClick={startCreating} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isCreating || editingItem !== null} onOpenChange={(open) => !open && cancelEditing()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Add New Menu Item' : 'Edit Menu Item'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={isCreating ? handleCreate : handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateMenuItemInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                placeholder="Describe the menu item"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      category: e.target.value || null 
                    }))
                  }
                  placeholder="e.g., Appetizers, Main Course, Desserts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMenuItemInput) => ({ 
                      ...prev, 
                      image_url: e.target.value || null 
                    }))
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_available"
                checked={formData.is_available}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev: CreateMenuItemInput) => ({ ...prev, is_available: checked }))
                }
              />
              <Label htmlFor="is_available">Available for order</Label>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : isCreating ? 'Add Item' : 'Update Item'}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Menu Items Display */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Menu Items</h3>
            <p className="text-gray-600 mb-6">Start building your menu by adding your first item.</p>
            <Button onClick={startCreating} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add First Menu Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Utensils className="h-5 w-5 mr-2" />
                  {category}
                  <Badge variant="secondary" className="ml-2">
                    {items.length} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item: MenuItem) => (
                    <Card key={item.id} className="relative">
                      <CardContent className="p-4">
                        {item.image_url && (
                          <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold">{item.name}</h4>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleAvailability(item)}
                                title={item.is_available ? 'Mark as unavailable' : 'Mark as available'}
                              >
                                {item.is_available ? (
                                  <Eye className="h-3 w-3 text-green-600" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(item)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-green-600">
                                {item.price.toFixed(2)}
                              </span>
                            </div>
                            <Badge 
                              variant={item.is_available ? 'default' : 'secondary'}
                              className={item.is_available ? 'bg-green-100 text-green-800' : ''}
                            >
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}