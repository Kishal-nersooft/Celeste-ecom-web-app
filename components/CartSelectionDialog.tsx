"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ShoppingCart, Plus, AlertTriangle, MapPin, Package } from "lucide-react";
import { Order } from "@/store";
import toast from "react-hot-toast";

interface CartSelectionDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateNewCart: (order: Order) => Promise<void>;
  onAddToExistingCart: (order: Order) => Promise<void>;
  loading?: boolean;
}

const CartSelectionDialog: React.FC<CartSelectionDialogProps> = ({
  order,
  isOpen,
  onClose,
  onCreateNewCart,
  onAddToExistingCart,
  loading = false
}) => {
  const [actionLoading, setActionLoading] = useState<'new' | 'existing' | null>(null);

  if (!order) return null;

  const handleCreateNewCart = async () => {
    setActionLoading('new');
    try {
      await onCreateNewCart(order);
      onClose();
    } catch (error) {
      console.error('Create new cart failed:', error);
      toast.error('Failed to create new cart. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToExisting = async () => {
    setActionLoading('existing');
    try {
      await onAddToExistingCart(order);
      onClose();
    } catch (error) {
      console.error('Add to existing cart failed:', error);
      toast.error('Failed to add to existing cart. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add Items from Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            You already have items in your cart. Choose how you'd like to add these items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {order.fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'} • 
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {order.items?.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span>{item.name} (Qty: {item.quantity})</span>
                    </div>
                  ))}
                  {order.items && order.items.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cart Selection Tabs */}
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Cart
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Add to Existing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Create New Cart</h3>
                    <p className="text-sm text-gray-600">
                      Create a separate cart for this reorder. You can switch between carts and checkout with either one.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Fresh cart with reorder items</li>
                      <li>• Can add more items to this cart</li>
                      <li>• Separate from your current cart</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Button
                onClick={handleCreateNewCart}
                disabled={loading || actionLoading !== null}
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                {actionLoading === 'new' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating New Cart...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create New Cart
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="existing" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Add to Existing Cart</h3>
                    <p className="text-sm text-gray-600">
                      Add these items to your current cart. Quantities will be combined if items already exist.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Items added to current cart</li>
                      <li>• Quantities combined for existing items</li>
                      <li>• Use current cart's delivery address</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Address Mismatch Warning */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Address Notice:</strong> The original order was delivered to a different address. 
                  Your current cart will use your selected delivery address.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={handleAddToExisting}
                disabled={loading || actionLoading !== null}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                {actionLoading === 'existing' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Adding to Cart...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Add to Existing Cart
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CartSelectionDialog;
