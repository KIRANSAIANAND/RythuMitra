"use client";

import Link from "next/link";
import { ShoppingCart, User, Menu, Mic, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemsCount } = useCart();
  
  const isConsumer = user?.profile?.role === "consumer";

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/images1.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-sm border border-agri-green" />
            <span className="text-xl font-bold text-agri-dark tracking-tight">RythuMitra</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-agri-green font-medium transition-colors">Marketplace</Link>
            
            {user && (
              <Link href="/my-orders" className="text-gray-600 hover:text-agri-green font-medium transition-colors">My Orders</Link>
            )}

            {!isConsumer && (
              <>
                <Link href="/farmer/dashboard" className="text-gray-600 hover:text-agri-green font-medium transition-colors">Farmer Hub</Link>
                <Link href="/farmer/orders" className="text-gray-600 hover:text-agri-green font-medium transition-colors">Orders Manager</Link>
              </>
            )}
            
            <div className="flex items-center gap-6 border-l pl-6">
              <Link href="/cart" className="relative text-gray-500 hover:text-agri-green transition-colors">
                <ShoppingCart size={20} />
                {itemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-agri-accent text-white text-[10px] rounded-full flex items-center justify-center font-bold">{itemsCount}</span>
                )}
              </Link>
              
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-agri-light text-agri-dark rounded-full flex items-center justify-center font-bold text-sm">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <button onClick={logout} className="text-gray-500 hover:text-red-500 transition-colors" title="Logout">
                    <LogOut size={20} />
                  </button>
                  {!isConsumer && (
                    <Link href="/farmer/add-product" className="bg-agri-green hover:bg-agri-dark text-white px-4 py-2 rounded-full font-medium transition-colors flex items-center gap-2 shadow-md">
                      <Mic size={16} />
                      Sell via Voice
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-gray-600 hover:text-agri-green font-medium transition-colors">
                    Log in
                  </Link>
                  <Link href="/signup" className="bg-agri-dark hover:bg-black text-white px-4 py-2 rounded-full font-medium transition-colors shadow-md">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-4 space-y-4 shadow-lg absolute w-full left-0 z-50">
          <Link href="/" className="block text-gray-600 font-medium">Marketplace</Link>
          {user && (
            <Link href="/my-orders" className="block text-gray-600 font-medium">My Orders</Link>
          )}
          {!isConsumer && (
            <>
              <Link href="/farmer/dashboard" className="block text-gray-600 font-medium">Farmer Hub</Link>
              <Link href="/farmer/orders" className="block text-gray-600 font-medium">Orders Manager</Link>
            </>
          )}
          <div className="flex gap-4 pt-2 border-t">
            <Link href="/cart" className="flex items-center gap-2 text-gray-600">
              <div className="relative">
                <ShoppingCart size={20} />
                {itemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-3 h-3 bg-agri-accent text-white text-[8px] rounded-full flex items-center justify-center font-bold">{itemsCount}</span>
                )}
              </div>
              Cart
            </Link>
            {user && (
              <button onClick={logout} className="flex items-center gap-2 text-red-500 font-medium">
                <LogOut size={20} /> Logout
              </button>
            )}
          </div>
          
          {user ? (
            !isConsumer && (
              <Link href="/farmer/add-product" className="bg-agri-green text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md mt-2 block w-full text-center">
                <Mic size={20} />
                Sell via Voice
              </Link>
            )
          ) : (
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
              <Link href="/login" className="block w-full text-center py-3 text-agri-dark font-medium border border-gray-200 rounded-xl">
                Log in
              </Link>
              <Link href="/signup" className="block w-full text-center py-3 bg-agri-dark text-white font-medium rounded-xl shadow-md">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
