"use client";

import { useState } from "react";
import VideoLoader from "./VideoLoader";
import Navbar from "./Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

export default function ClientWrapper({ children }) {
  const [showLoader, setShowLoader] = useState(true);

  return (
    <AuthProvider>
      <CartProvider>
        {showLoader && <VideoLoader onComplete={() => setShowLoader(false)} />}
        
        {!showLoader && (
          <div className="min-h-screen bg-bg-light flex flex-col transition-opacity duration-1000 ease-in opacity-100">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        )}
      </CartProvider>
    </AuthProvider>
  );
}
