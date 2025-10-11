"use client";
import { useState } from "react";
import Loader from "@/components/Loader";

const TestLoaderPage = () => {
  const [showLoader, setShowLoader] = useState(false);

  const toggleLoader = () => {
    setShowLoader(!showLoader);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Loader Test</h1>
        <p className="text-gray-600 mb-6 text-center">
          Click the button below to test the loader with loaderImage1.png
        </p>
        <button
          onClick={toggleLoader}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          {showLoader ? "Hide Loader" : "Show Loader"}
        </button>
      </div>
      
      {showLoader && <Loader />}
    </div>
  );
};

export default TestLoaderPage;
