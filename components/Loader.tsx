import loaderImage from "@/images/loaderImage1.png";
import Image from "next/image";

const Loader = () => {
  return (
    <div className="fixed top-0 left-0 w-full min-h-screen z-50 bg-white flex items-center justify-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Spinning border */}
        <div className="absolute inset-0 rounded-full border-2 border-dotted border-gray-400 animate-spin-slow"></div>
        
        {/* Spinning image */}
        <div className="animate-spin-slow">
          <Image
            src={loaderImage}
            alt="Loading..."
            width={56}
            height={56}
            className="w-14 h-14 object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default Loader;
