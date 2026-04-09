"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Truck, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [address, setAddress] = useState({
    name: user?.profile?.name || user?.displayName || "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: ""
  });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handlePlace = async () => {
    if (!address.name || !address.phone || !address.street || !address.city || !address.pincode) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!user) { setError("Please log in to place an order."); return; }
    if (cartItems.length === 0) { setError("Your cart is empty."); return; }

    setPlacing(true);
    setError("");
    try {
      // Group items by farmer for notification
      const farmerMap = {};
      cartItems.forEach(item => {
        if (item.farmerId) {
          if (!farmerMap[item.farmerId]) farmerMap[item.farmerId] = [];
          farmerMap[item.farmerId].push(item);
        }
      });

      const orderPromises = cartItems.map(item => {
        return addDoc(collection(db, "orders"), {
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          farmerId: item.farmerId || null,
          farmerName: item.farmerName || null,
          userId: user.uid,
          customerId: user.uid,
          userEmail: user.email,
          customerName: address.name,
          deliveryAddress: address,
          total: Number(item.price) * item.quantity,
          paymentMethod: "COD",
          status: "Pending",
          deliveryTime: null,
          createdAt: serverTimestamp()
        });
      });
      const orderDocs = await Promise.all(orderPromises);

      // Attempt to notify farmers (best-effort, no blocking)
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderDocs[0]?.id || "multi",
            farmerMap,
            address,
            total: cartTotal
          })
        });
      } catch (notifyErr) {
        console.warn("Notification failed (non-blocking):", notifyErr);
      }

      await clearCart();
      setDone(true);
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to place order: " + err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-sm w-full"
        >
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Order Placed! 🎉</h2>
          <p className="text-gray-500">Your order has been confirmed. The farmer has been notified. Redirecting…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/cart" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 font-medium">
            <ArrowLeft size={18} /> Back to Cart
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4">Checkout</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Address Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-black">
              {[
                { label: "Full Name *", key: "name", placeholder: "Your name", half: false },
                { label: "Phone Number *", key: "phone", placeholder: "10-digit mobile", half: false },
                { label: "Street / Village *", key: "street", placeholder: "House no, street, village", half: false },
                { label: "City / Town *", key: "city", placeholder: "City", half: true },
                { label: "State *", key: "state", placeholder: "State", half: true },
                { label: "Pincode *", key: "pincode", placeholder: "6-digit pincode", half: false }
              ].map(field => (
                <div key={field.key} className={field.half ? "" : "sm:col-span-2 col-span-1"}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{field.label}</label>
                  <input
                    type="text"
                    value={address[field.key]}
                    onChange={e => setAddress({ ...address, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Payment Method</h3>
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <Truck className="text-emerald-600 w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Cash on Delivery (COD)</p>
                  <p className="text-sm text-gray-500">Pay when your fresh produce is delivered to your door.</p>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-4">Order Summary</h3>
              <div className="space-y-3 mb-5 text-black">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} × {item.quantity}</span>
                    <span className="font-medium">₹{Number(item.price) * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black text-emerald-600">₹{cartTotal}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Includes free delivery</p>
              </div>
              <button
                onClick={handlePlace}
                disabled={placing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {placing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                {placing ? "Placing Order…" : "Place Order (COD)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
