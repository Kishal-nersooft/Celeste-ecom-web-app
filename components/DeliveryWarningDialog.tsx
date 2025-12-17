import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPinIcon } from "lucide-react";

interface DeliveryWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeliveryWarningDialog: React.FC<DeliveryWarningDialogProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-orange-500" />
            Delivery Notice
          </DialogTitle>
          <DialogDescription className="pt-2">
            We cannot deliver to this location today due to the distance and some perishable food items that require special handling.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Your order will take additional days to arrive. We apologize for any inconvenience and appreciate your understanding.
          </p>
        </div>
        <DialogFooter>
          <Button 
            onClick={onClose}
            className="w-full"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryWarningDialog;

