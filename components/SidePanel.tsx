"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon, HomeIcon, UserIcon, HeartIcon, MapPinIcon, LogOutIcon, HelpCircleIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import Image from "next/image";
import logo from "@/images/logo.png";

export const SidePanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Clear cart store on logout to prevent permission issues
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart-store');
      }
      toast.success("Signed out successfully!");
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 18H10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"></path> <path d="M4 12L16 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"></path> <path d="M4 6L20 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"></path> </g></svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px] sm:w-[300px]">
        <SheetHeader className="mb-8">
          <SheetTitle>
            <Link href="/">
              <Image src={logo} alt="Shop Logo" width={100} height={40} />
            </Link>
          </SheetTitle>
        </SheetHeader>
        
        {/* User Profile Section */}
        {user && (
          <div className="mb-6 pb-4 border-b border-gray-200">
            <Link 
              href="/profile" 
              className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                {user.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt="Profile" 
                    width={48} 
                    height={48} 
                    className="rounded-full"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg text-gray-900">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-sm text-amber-600 font-medium">
                  Manage Account
                </span>
              </div>
            </Link>
          </div>
        )}
        
        <nav className="flex flex-col space-y-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
            onClick={() => setIsOpen(false)}>
            <HomeIcon className="h-5 w-5" />
            Home
          </Link>
          <Link href="/help" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
            onClick={() => setIsOpen(false)}>
            <HelpCircleIcon className="h-5 w-5" />
            Help
          </Link>
          {user && (
            <>
              <Link href="/orders" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
                onClick={() => setIsOpen(false)}>
                <UserIcon className="h-5 w-5" />
                Orders
              </Link>
              <Link href="/saved-address" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
                onClick={() => setIsOpen(false)}>
                <MapPinIcon className="h-5 w-5" />
                Saved Address
              </Link>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-lg font-medium justify-start p-0 hover:text-blue-600"
              >
                <LogOutIcon className="h-5 w-5" />
                Log Out
              </Button>
            </>
          )}
          {!user && (
            <>
              <Link href="/sign-in" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
                onClick={() => setIsOpen(false)}>
                <UserIcon className="h-5 w-5" />
                Login
              </Link>
              <Link href="/sign-up" className="flex items-center gap-2 text-lg font-medium hover:text-blue-600"
                onClick={() => setIsOpen(false)}>
                <UserIcon className="h-5 w-5" />
                Register
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
