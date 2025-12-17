import React from "react";
import Container from "./Container";
import Image from "next/image";
import payment from "@/images/payment.png";
import celesteLogo from "@/images/CelesteLogoiconwhitecopy2.png";
import celesteLogoText from "@/images/Celeste-Logo-white2.png";


const Footer = () => {
  return (
    <div className="bg-black text-white relative">
      {/* Logo with circle background - positioned to overlap */}
      <div className="absolute left-1/2 transform -translate-x-1/2 -top-6 sm:-top-8 md:-top-12 z-10 pt-2 sm:pt-3 md:pt-5">
        <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-black rounded-full flex items-center justify-center border-2 sm:border-3 md:border-4 border-black">
          <Image 
            src={celesteLogo} 
            alt="Celeste Logo Icon" 
            width={40} 
            height={40}
            className="object-contain sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20"
          />
        </div>
      </div>

      <Container className="pt-8 sm:pt-10 md:pt-12 lg:pt-16 pb-4 sm:pb-6 md:pb-8">
        <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
          {/* Left Section - Contact Us */}
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 md:mb-6">Contact Us</h3>
            
            <div>
              <h4 className="text-white font-medium mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">Email</h4>
              <p className="text-gray-300 text-[10px] sm:text-xs md:text-sm">Hello@celeste.lk</p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">Phone</h4>
              <p className="text-gray-300 text-[10px] sm:text-xs md:text-sm">+94 11 750 9000</p>
            </div>
          </div>

          {/* Center Section - Logo and Address */}
          <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
            {/* Main Celeste Logo */}
            <div className="mt-1 sm:mt-2 md:mt-4">
              <Image 
                src={celesteLogoText}
                alt="Celeste Logo" 
                width={120} 
                height={36}
                className="mx-auto object-contain sm:w-[140px] sm:h-[42px] md:w-[160px] md:h-[48px] lg:w-[180px] lg:h-[54px] xl:w-[200px] xl:h-[60px]"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            
            {/* Address */}
            <div>
              <p className="text-gray-300 text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg">
                38 Iswari Rd, Colombo 6, Sri Lanka
              </p>
            </div>
          </div>

          {/* Right Section - Quick Links */}
          <div className="flex justify-end text-right">
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 md:mb-6 text-right">Quick Links</h3>

              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-[10px] sm:text-xs md:text-sm">
                Our Locations
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-[10px] sm:text-xs md:text-sm">
                About Us
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-[10px] sm:text-xs md:text-sm">
                Careers
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-[10px] sm:text-xs md:text-sm">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom Copyright Section */}
      <div className="border-t border-gray-800 mt-4 sm:mt-6 md:mt-8">
        <Container className="py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-center">
            <p className="text-gray-500 text-center text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
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