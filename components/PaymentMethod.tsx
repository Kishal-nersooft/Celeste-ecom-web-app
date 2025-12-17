"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle } from "lucide-react";
import AddCardDialog from "./AddCardDialog";

const PaymentMethod: React.FC = () => {
  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const [cardAdded, setCardAdded] = useState(false);

  const handleAddCardClick = () => {
    setShowAddCardDialog(true);
  };

  const handleContinue = () => {
    setCardAdded(true);
    setShowAddCardDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <CreditCard className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Card Payment</div>
                  {cardAdded ? (
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Card added successfully
                    </div>
                  ) : (
                    <div className="text-[10px] sm:text-xs text-gray-500">Add your card details for payment</div>
                  )}
                </div>
              </div>
              {!cardAdded && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddCardClick}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs sm:text-sm px-2 py-1"
                >
                  Add Card
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AddCardDialog
        isOpen={showAddCardDialog}
        onClose={() => setShowAddCardDialog(false)}
        onContinue={handleContinue}
      />
    </>
  );
};

export default PaymentMethod;
