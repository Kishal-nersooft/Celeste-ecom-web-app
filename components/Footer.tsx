import React from "react";
import Container from "./Container";
import Image from "next/image";
import payment from "@/images/payment.png";
import celesteLogo from "@/images/CelesteLogoiconwhitecopy2 copy.png";
import celesteLogoText from "@/images/Celeste-Logo-white2.png";


const Footer = () => {
  return (
    <div className="bg-black text-white relative">
      {/* Logo with circle background - positioned to overlap */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 z-10 pt-5">
        <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-black">
          <Image 
            src={celesteLogo} 
            alt="Celeste Logo Icon" 
            width={80} 
            height={80}
            className="object-contain"
          />
        </div>
      </div>

      <Container className="pt-16 pb-8">
        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Left Section - Contact Us */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-6">Contact Us</h3>
            
            <div>
              <h4 className="text-white font-medium mb-2">Email</h4>
              <p className="text-gray-300">Hello@celeste.lk</p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-2">Phone</h4>
              <p className="text-gray-300">+94 11 750 9000</p>
            </div>
          </div>

          {/* Center Section - Logo and Address */}
          <div className="text-center space-y-6">
            {/* Main Celeste Logo */}
            <div className="mt-4">
              <Image 
                src={celesteLogoText}
                alt="Celeste Logo" 
                width={200} 
                height={60}
                className="mx-auto object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            
            {/* Address */}
            <div>
              <p className="text-gray-300 text-lg">
                38 Iswari Rd, Colombo 6, Sri Lanka
              </p>
            </div>
          </div>

          {/* Right Section - Quick Links */}
          <div className="flex justify-end text-right">
            
            <div className="space-y-3">
            <h3 className="text-xl font-semibold mb-6 text-right">Quick Links</h3>

              <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                Our Locations
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                About Us
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                Careers
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom Copyright Section */}
      <div className="border-t border-gray-800 mt-8">
        <Container className="py-4">
          <div className="flex items-center justify-center">
            <p className="text-gray-500 text-center">
              Copyright © 2024{" "}
              <span className="text-white font-semibold">Celeste</span> all
              rights reserved.
            </p>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Footer;