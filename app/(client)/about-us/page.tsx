"use client";

import Image from "next/image";
import Container from "@/components/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Leaf, Users, Award } from "lucide-react";
import celesteLogo from "@/images/CelesteLogoiconwhitecopy2.png";
import celesteLogoText from "@/images/Celeste-Logo-white2.png";
import groceryImage from "@/images/Group400.png";

export default function AboutUsPage() {
  const highlights = [
    {
      icon: Leaf,
      title: "Fresh & Quality",
      description: "We source the freshest produce and quality products so your family gets the best every day.",
    },
    {
      icon: Heart,
      title: "Care for Community",
      description: "Celeste is part of your neighborhood. We're committed to supporting local and sustainable choices.",
    },
    {
      icon: Users,
      title: "Friendly Service",
      description: "Our team is here to help you find what you need and make your visit a pleasant one.",
    },
    {
      icon: Award,
      title: "Trusted Brand",
      description: "Years of service have made Celeste a trusted name for daily groceries and household needs.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-black text-white">
        <Container className="py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                About Celeste
              </h1>
              <p className="text-gray-300 text-lg max-w-xl">
                We are your neighborhood daily store—bringing fresh produce, pantry staples, and household essentials closer to you. At Celeste, we believe in quality, convenience, and care.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src={celesteLogo}
                alt="Celeste"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          </div>
        </Container>
      </div>

      {/* Content + Image Section */}
      <Container className="py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Our Story
            </h2>
            <p className="text-gray-600 mb-4">
              Celeste started with a simple idea: make everyday shopping easier and more enjoyable. From our first outlet to our growing network across Colombo and beyond, we've stayed focused on what matters—fresh products, fair prices, and a welcoming experience.
            </p>
            <p className="text-gray-600">
              Today, Celeste Daily serves families and individuals who value quality and convenience. We continue to expand our range and our locations so more of you can shop with confidence close to home.
            </p>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
            <Image
              src={groceryImage}
              alt="Celeste products and freshness"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </Container>

      {/* Highlight Cards - Interactive */}
      <Container className="py-10 md:py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
          Why Choose Celeste
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item) => (
            <Card
              key={item.title}
              className="group overflow-hidden border border-gray-200 bg-white hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-default"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>

      {/* Bottom CTA */}
      <div className="bg-gray-900 text-white py-10 md:py-12">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <Image
                src={celesteLogoText}
                alt="Celeste"
                width={160}
                height={48}
                className="object-contain"
              />
              <p className="text-gray-400 mt-2">Your daily store, your neighborhood choice.</p>
            </div>
            <p className="text-gray-300 text-sm md:text-base max-w-md text-center md:text-right">
              Visit any of our outlets or shop online. We're here for you.
            </p>
          </div>
        </Container>
      </div>
    </div>
  );
}
