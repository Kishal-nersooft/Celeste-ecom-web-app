import React from "react";
import logo from "@/images/logo.png";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Image from "next/image";
import { Lock } from "lucide-react";
import Link from "next/link";

const NoAccessToCart = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="mx-auto h-24 w-24 text-gray-400 mb-4" />
          <CardTitle className="text-3xl font-bold">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            You need to be logged in to view your cart. Please sign in or create an account.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoAccessToCart;
