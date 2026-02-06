"use client";

import Container from "@/components/Container";
import InquiryForm from "@/components/InquiryForm";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white py-8">
        <Container>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Support Resources for CELESTE
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              In the meantime, if your enquiry is urgent and you require immediate assistance,
              our customer care team is here to assist you. Submit an inquiry below.
            </p>
          </div>
        </Container>
      </div>

      {/* Main Content - Same form as Contact Us */}
      <Container className="py-8">
        <InquiryForm />
      </Container>
    </div>
  );
}
