import React from "react";

/**
 * Payment Processing Terms & Conditions (checkout / payment flow).
 */
export function PaymentTermsContent() {
  return (
    <div className="space-y-4 text-gray-700">
      <section>
        <h3 className="font-semibold text-gray-900">1. Acceptance of Terms</h3>
        <p className="mt-1">
          By proceeding with a payment on this website, you acknowledge that you have read, understood, and agreed to
          these Payment Terms &amp; Conditions. This applies to all transactions processed through our payment partners.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">2. Payment Methods</h3>
        <p className="mt-1">
          We accept payments via approved Sri Lankan payment gateways and banking channels, including but not limited to:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Visa / Mastercard / American Express</li>
          <li>Online banking transfers</li>
          <li>Digital payment gateways such as PayHere, WebXPay, LankaPay &amp; JustPay.</li>
        </ul>
        <p className="mt-2">All payments are processed securely through certified third-party payment service providers.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">3. Payment Gateway Processing</h3>
        <p className="mt-1">
          All online transactions are securely processed through licensed payment gateways such as PayHere, WebXPay,
          LankaPay &amp; JustPay.
        </p>
        <p className="mt-2">
          We do not store or process your card details on our servers. All sensitive payment data is handled directly by
          PCI-DSS compliant payment processors.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">4. Pricing &amp; Currency</h3>
        <p className="mt-1">
          In compliance with Central Bank of Sri Lanka directives, Celesteit.lk does not add any surcharge for payments
          made using Sri Lankan-issued debit or credit cards. The price displayed at checkout is the final price you pay.
          For international cards, your issuing bank may apply foreign exchange fees or cross-border charges, which are
          beyond our control.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">5. Authorization &amp; Fraud Prevention</h3>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>All payments are subject to authorization by the issuing bank or payment provider.</li>
          <li>
            We reserve the right to cancel or hold any transaction flagged as suspicious, fraudulent, or non-compliant
            with security checks.
          </li>
          <li>Additional verification may be requested where required.</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">6. Order Confirmation</h3>
        <p className="mt-1">
          An order is confirmed only after successful payment authorization and receipt of confirmation from the payment
          gateway.
        </p>
        <p className="mt-2">In case of payment failure, cancellation, or timeout, the order will not be processed.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">7. Refunds &amp; Reversals</h3>
        <p className="mt-1">
          Refunds, if applicable, will be processed according to our Refund Policy. Celesteit.lk initiates refunds within
          48 hours of approval. Your bank may take 7 to 14 working days to reflect the credit. Any transaction fee charged
          by the payment gateway (typically Rs. 25 for LankaPay, 2.5–3% for cards) is deducted by the gateway and may not
          be refundable. However, Celesteit.lk does not charge any separate processing fees.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">8. Chargebacks</h3>
        <p className="mt-1 font-medium text-gray-900">Step 1 – Internal Resolution</p>
        <p className="mt-1">
          Before filing a chargeback with your bank, you must contact us at{" "}
          <a href="mailto:hello@celeste.lk" className="text-blue-700 underline underline-offset-2">
            hello@celeste.lk
          </a>
          . We will respond within 5 business days.
        </p>
        <p className="mt-3 font-medium text-gray-900">Step 2 – Chargeback Rights</p>
        <p className="mt-1">
          If the dispute is unresolved, you have the right to file a chargeback with your card-issuing bank. In cases of
          genuine unauthorized transactions where you have not shared your OTP or credentials, you hold zero liability under
          CBSL guidelines.
        </p>
        <p className="mt-3 font-medium text-gray-900">Step 3 – Wrongful Chargebacks</p>
        <p className="mt-1">
          If an investigation proves the transaction was valid (e.g., OTP verified, product delivered), you agree to
          withdraw the chargeback and shall be liable for any bank penalties imposed on Celesteit.lk.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">9. Compliance with Sri Lanka Regulations</h3>
        <p className="mt-1">These Payment Terms are governed by:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>(a) Electronic Transactions Act No. 19 of 2006 (as amended);</li>
          <li>(b) Payment and Settlement Systems Act No. 28 of 2005;</li>
          <li>
            (c) Central Bank of Sri Lanka circulars on payment card surcharges (prohibition), unauthorized transaction
            liability (zero liability framework), and consumer protection.
          </li>
        </ul>
        <p className="mt-2">
          We adhere to industry-standard security and data protection practices to ensure safe and lawful transaction
          processing.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">10. Security Disclaimer</h3>
        <p className="mt-1">While we use secure and encrypted payment systems:</p>
        <ul className="mt-2 list-disc pl-5 space-y-2">
          <li>
            Celesteit.lk uses a Level-1 PCI DSS compliant payment gateway and implements industry-standard encryption.
            However, no system is 100% secure.
          </li>
          <li>Celesteit.lk is liable for security failures originating from our systems or our gateway partner’s systems.</li>
          <li>
            Customers are liable for unauthorized access resulting from their own negligence (e.g., sharing OTP, using weak
            passwords, failing to secure their device).
          </li>
          <li>
            Inter-bank delays and technical failures by third-party providers beyond our reasonable control are not our
            liability, but we will assist in resolving them.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">11. Changes to Terms</h3>
        <p className="mt-1">
          We reserve the right to update these Payment Terms from time to time. Material changes will be notified via email
          or a website notice at least 14 days in advance. Continued use of the payment system after the effective date
          constitutes acceptance.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">12. Contact Information</h3>
        <p className="mt-1">For any payment-related queries or disputes, please contact our support team at:</p>
        <p className="mt-2">
          <a href="tel:0117509000" className="text-blue-700 underline underline-offset-2">
            0117509000
          </a>
          {" / "}
          <a href="mailto:hello@celeste.lk" className="text-blue-700 underline underline-offset-2">
            hello@celeste.lk
          </a>
        </p>
      </section>
    </div>
  );
}
