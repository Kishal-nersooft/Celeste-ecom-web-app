"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, User, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

// Import the images
import celesteLogoIcon from "@/images/CelesteLogoiconwhitecopy2 copy.png";
import celesteLogoWhite from "@/images/Celeste-Logo-white2.png";
import groceryBagImage from "@/images/Group 400.png";

export default function HelpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log("Form submitted:", formData);
    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Support Resources for CELESTE
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              In the meantime, if your enquiry is urgent and you require immediate assistance, 
              our customer care team is here to assist you.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 rounded-2xl shadow-lg">
          <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
            {/* Left Side - Contact Form */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Enter Your Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-9 h-10 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="Enter Your Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-9 h-10 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="Enter Your Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="pl-9 h-10 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="message"
                      name="message"
                      required
                      placeholder="Write Your Message..."
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      className="pl-9 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                >
                  Send Message
                </Button>
              </div>

              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <Phone className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Phone</p>
                      <p className="text-xs text-gray-600">+9411750900</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <Mail className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Email</p>
                      <p className="text-xs text-gray-600">Hello@celeste.lk</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Address</p>
                      <p className="text-xs text-gray-600">Clmb 6, Sri Lanka</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Side - Split Layout */}
            <div className="flex h-full relative overflow-hidden rounded-2xl">
              {/* Left Half - White background */}
              <div className="bg-white rounded-l-2xl w-1/2 flex items-center justify-center relative z-10">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-800 bg-gray-100 px-3 py-1 rounded-full">Fresh Products</p>
                </div>
              </div>

              {/* Right Half - Black background with Logos */}
              <div className="bg-black rounded-r-2xl w-1/2 flex flex-col items-center justify-start pt-8 relative z-10 p-6">
                <div className="flex flex-col items-center space-y-3">
                  <Image
                    src={celesteLogoIcon}
                    alt="Celeste Logo Icon"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                  <Image
                    src={celesteLogoWhite}
                    alt="Celeste Logo"
                    width={120}
                    height={25}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Image on top of everything */}
              <div className="absolute inset-0 z-20 flex items-end justify-center -mb-10">
                <Image
                  src={groceryBagImage}
                  alt="Grocery Products Collage"
                  width={450}
                  height={350}
                  className="w-4/5 h-4/5 object-contain"
                />
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
