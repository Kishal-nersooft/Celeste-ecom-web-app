"use server";

import stripe from "@/lib/stripe";
import Stripe from "stripe";
import { CartItem } from "@/store";

export interface CheckoutItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  currency: string;
  quantity: number;
}

export async function createCheckoutSession(
  items: CheckoutItem[],
  userEmail: string,
  userId: string,
) {
  try {
    const itemsWithoutPrice = items.filter((item) => !item.price);
    if (itemsWithoutPrice.length > 0) {
      throw new Error("Some items do not have a price");
    }

    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    const customerId = customers.data.length > 0 ? customers.data[0].id : "";

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      metadata: {
        customerEmail: userEmail,
        clerkUserId: userId,
      },
      mode: "payment",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      success_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.VERCEL_URL}`
      }/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.VERCEL_URL}`
      }/checkout`,
      line_items: items.map((item) => ({
        price_data: {
          currency: item.currency,
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name || "Unnamed Product",
            description: "", // Description not directly available in CheckoutItem
            metadata: { id: item.id },
            images: item.image ? [item.image] : undefined,
          },
        },
        quantity: item.quantity,
      })),
    };

    if (customerId) {
      sessionPayload.customer = customerId;
    } else {
      sessionPayload.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    return session.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}
