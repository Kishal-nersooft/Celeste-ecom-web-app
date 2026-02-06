"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";
import Container from "@/components/Container";
import storeImage from "@/images/store-image.jpeg";

const locations = [
  {
    id: "colombo-06",
    name: "Celeste Daily - Colombo 06",
    address: "166 Maya Ave, Colombo 00600",
    phone: "0117509000",
    image: storeImage,
  },
  {
    id: "attidiya",
    name: "Celeste Daily - Attidiya",
    address: "36 Canal Rd, Attidiya Rd, Dehiwala-Mount Lavinia 10390",
    phone: "0117509000",
    image: storeImage,
  },
  {
    id: "ethul-kotte",
    name: "Celeste Daily - Ethul Kotte",
    address: "903 Kotte Rd, Sri Jayawardenepura Kotte",
    phone: "0117509000",
    image: storeImage,
  },
  {
    id: "pannipitiya",
    name: "Celeste Daily - Pannipitiya",
    address: "41 Weera Mawatha, Pannipitiya 10132",
    phone: "0117509000",
    image: storeImage,
  },
];

export default function OurLocationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <Container className="py-8 md:py-10">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Our Locations
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Visit us at any of our Celeste Daily outlets. We&apos;re here to serve you with fresh products and friendly service.
            </p>
          </div>
        </Container>
      </div>

      {/* Location Cards */}
      <Container className="py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {locations.map((loc) => (
            <Card
              key={loc.id}
              className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-200 bg-white"
            >
              {/* Outlet Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
                <Image
                  src={loc.image}
                  alt={loc.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                {/* C badge overlay */}
                <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  C
                </div>
              </div>

              <CardContent className="p-4 md:p-5 space-y-3">
                <h2 className="font-semibold text-gray-900 text-base md:text-lg leading-tight">
                  {loc.name}
                </h2>
                <div className="flex items-start gap-2 text-gray-600 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-500" />
                  <span>{loc.address}</span>
                </div>
                <a
                  href={`tel:${loc.phone}`}
                  className="flex items-center gap-2 text-sm font-medium text-black hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {loc.phone}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </div>
  );
}
