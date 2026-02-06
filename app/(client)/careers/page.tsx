"use client";

import { Briefcase } from "lucide-react";
import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <Container className="py-8 md:py-10">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Careers at Celeste
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join our team and be part of bringing fresh, quality products to our communities.
            </p>
          </div>
        </Container>
      </div>

      {/* No opportunities message */}
      <Container className="py-12 md:py-16">
        <Card className="max-w-2xl mx-auto border border-gray-200 shadow-sm">
          <CardContent className="p-8 md:p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
              No available opportunities right now
            </h2>
            <p className="text-gray-600 mb-6">
              We don&apos;t have any open positions at the moment. Check back later or follow us for updates—we&apos;d love to have you on the team when the right role opens up.
            </p>
            <p className="text-sm text-gray-500">
              You can also reach us at <a href="mailto:Hello@celeste.lk" className="text-black font-medium hover:underline">Hello@celeste.lk</a> with your CV if you&apos;d like to be considered for future openings.
            </p>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
