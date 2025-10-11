"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentForm from "./PaymentForm";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentSuccess: (paymentData: any) => void;
  loading?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onPaymentSuccess,
  loading = false
}) => {
  const handlePaymentSuccess = (paymentData: any) => {
    console.log('💳 PAYMENT MODAL - Payment success received:', paymentData);
    console.log('💳 PAYMENT MODAL - Calling onPaymentSuccess and closing modal');
    onPaymentSuccess(paymentData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Enter your payment details to complete the order
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          totalAmount={totalAmount}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={onClose}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
