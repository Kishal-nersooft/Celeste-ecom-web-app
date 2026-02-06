"use client";

import Image from "next/image";
import Container from "@/components/Container";
import InquiryForm from "@/components/InquiryForm";
import celesteLogoText from "@/images/Celeste-Logo-white2.png";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contact Us header - simple and matching */}
      <div className="bg-black text-white py-10 md:py-14">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-gray-300 text-lg">
              Have a question or feedback? We&apos;d love to hear from you. Send us an inquiry below and we&apos;ll get back to you soon.
            </p>
            <div className="mt-8 flex justify-center">
              <Image
                src={celesteLogoText}
                alt="Celeste"
                width={140}
                height={42}
                className="object-contain opacity-90"
              />
            </div>
          </div>
        </Container>
      </div>

      {/* Send us an inquiry form */}
      <Container className="py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
          Send us an inquiry
        </h2>
        <InquiryForm />
      </Container>
    </div>
  );
}
