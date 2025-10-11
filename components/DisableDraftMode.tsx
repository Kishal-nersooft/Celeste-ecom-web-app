"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

const DisableDraftMode = () => {
  const router = useRouter();

  const handleClick = async () => {
    await fetch("/draft-mode/disable");
    router.refresh();
  };
  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-4 right-4 bg-gray-50 px-4 py-2 z-50 text-black hover:text-white hoverEffect"
    >
      Disable Draft Mode
    </Button>
  );
};

export default DisableDraftMode;
