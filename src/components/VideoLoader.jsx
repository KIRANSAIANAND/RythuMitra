"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function VideoLoader({ onComplete }) {
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  useEffect(() => {
    // Auto-complete after 4 seconds as a reliable fallback
    const timer = setTimeout(() => {
      handleComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    if (!isVideoEnded) {
      setIsVideoEnded(true);
      if (onComplete) onComplete();
    }
  };

  if (isVideoEnded) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <video
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain md:object-cover"
        onEnded={handleComplete}
      >
        <source src="/Farmer_Ploughing_Field_Animation.mp4" type="video/mp4" />
      </video>
      
      {/* Non-intrusive Skip Button at bottom right */}
      <div className="absolute bottom-8 right-8 z-10">
        <motion.button
          onClick={handleComplete}
          className="bg-black/50 hover:bg-black/80 text-white px-6 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-all border border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Skip
        </motion.button>
      </div>
    </motion.div>
  );
}
