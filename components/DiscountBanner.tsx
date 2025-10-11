'use client';

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface Sale {
  id: string;
  title: string;
  description?: string;
  discountAmount: number;
  couponCode: string;
  badge: string;
  imageUrl?: string;
}

const DiscountBanner = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data fetching
    const getSales = async (): Promise<Sale[]> => {
      // For now, return static data or fetch from a placeholder API
      return [
        {
          id: "sale1",
          title: "Summer Sale",
          description: "Get ready for summer with amazing discounts!",
          discountAmount: 20,
          couponCode: "SUMMER20",
          badge: "hot",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---1.png",
        },
        {
          id: "sale2",
          title: "Flash Sale",
          description: "Limited time offer on selected items.",
          discountAmount: 15,
          couponCode: "FLASH15",
          badge: "new",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---2.png",
        },
        {
          id: "sale3",
          title: "Mega Sale",
          description: "Don't miss out on our biggest sale ever!",
          discountAmount: 30,
          couponCode: "MEGA30",
          badge: "exclusive",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---3.png",
        },
      ];
    };

    getSales().then((salesData) => {
      setSales(salesData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-screen-xl mx-auto mt-10 mb-5">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading offers...</div>
        </div>
      </div>
    );
  }

  return (
    <Carousel className="w-full max-w-screen-xl mx-auto mt-10 mb-5">
      <CarouselContent>
        {sales.map((sale) => (
          <CarouselItem key={sale.id}>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="flex-1 p-6 md:px-12">
                    <Badge
                      variant="secondary"
                      className="mb-2 md:mb-4 text-darkBlue capitalize"
                    >
                      {sale.badge} {sale.discountAmount}% off
                    </Badge>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-2 md:mb-4">
                      {sale.title}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {sale.description}
                    </p>
                    <p className="mb-4">
                      Use code:{" "}
                      <span className="font-semibold text-primary uppercase">
                        {sale.couponCode}
                      </span>{" "}
                      for{" "}
                      <span className="font-semibold">
                        {sale.discountAmount}%
                      </span>{" "}
                      OFF
                    </p>
                    <Button>Shop Now</Button>
                  </div>

                  {sale.imageUrl && (
                    <div className="w-full md:w-1/2 h-auto relative flex items-center justify-center py-2">
                      <Image
                        src={sale.imageUrl}
                        alt={"bannerImage"}
                        width={500}
                        height={500}
                        priority
                        className="object-cover transition-transform duration-300 ease-in-out hover:scale-105"
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-2" />
      <CarouselNext className="absolute right-2" />
    </Carousel>
  );
};

export default DiscountBanner;
