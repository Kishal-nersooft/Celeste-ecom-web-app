import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import PriceFormatter from "./PriceFormatter";
import Image from "next/image";
import { Order } from "@/store";

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order Details - {order.id}</DialogTitle>
          <DialogDescription>
            View detailed information about your order including items, quantities, and pricing.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <p>
            <strong>Order Number:</strong> {order.orderNumber}
          </p>
          <p>
            <strong>Customer:</strong> {order.customerName || "Customer"}
          </p>
          <p>
            <strong>Email:</strong> {order.email || "N/A"}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {order.createdAt && new Date(order.createdAt).toLocaleDateString()}
          </p>
          <p>
            <strong>Status:</strong> {order.status}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items?.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="flex items-center gap-2">
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt="productImage"
                      width={50}
                      height={50}
                      className="border rounded-sm"
                    />
                  )}
                  {item?.name}
                </TableCell>
                <TableCell>{item?.quantity}</TableCell>
                <TableCell>
                  <PriceFormatter
                    amount={item?.price}
                    className="text-black font-medium"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 text-right">
          <strong>Total: </strong>
          <PriceFormatter
            amount={order?.totalAmount}
            className="text-black font-bold"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
