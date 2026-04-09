"use client";

import Link from "next/link";
import { ArrowLeft, Trash2, ShieldCheck, CreditCard, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, isLoaded } = useCart();

  if (!isLoaded) {
    return <div className="min-h-screen bg-bg-light flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="bg-bg-light min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-agri-green hover:text-agri-dark font-medium transition-colors">
            <ArrowLeft size={20} /> Continue Shopping
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 mt-6">Your Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
              <ShoppingBag size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Looks like you haven't added any fresh produce yet. Go browse the marketplace to find fresh products directly from farmers.</p>
            <Link href="/" className="bg-agri-green hover:bg-agri-dark text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 text-black">
            
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl || "/images1.jpg"} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">Sold by: {item.farmerName || "RythuMitra Farmer"}</p>
                    <p className="text-xs bg-agri-light text-agri-dark px-2 py-1 rounded inline-block font-bold">
                      {item.freshness || "90"}% AI Freshness
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center sm:items-end gap-4 min-w-[120px]">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-l-lg transition-colors disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 font-medium border-x border-gray-200">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-r-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xl font-bold text-gray-900 w-full text-center sm:text-right">₹{item.price * item.quantity}</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 sticky top-24">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span className="text-agri-green font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Farmer Commission (0%)</span>
                    <span>₹0</span>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-6 mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-black text-agri-green">₹{cartTotal}</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <ShieldCheck size={14} className="text-agri-green" /> 100% Secure Payment
                  </p>
                </div>
                
                <Link 
                  href="/checkout"
                  className="w-full bg-agri-dark hover:bg-black text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} /> Proceed to Checkout
                </Link>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
