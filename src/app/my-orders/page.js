"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { ShoppingBag, Loader2, Package, Calendar } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rating Modal state
  const [ratingModal, setRatingModal] = useState(null); // { orderId, productId, productName }
  const [ratingVal, setRatingVal] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const submitRating = async () => {
    if (!ratingModal) return;
    setSubmittingRating(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: ratingModal.productId,
          userId: user.uid,
          rating: ratingVal,
          feedback
        })
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      alert("Rating submitted! Thank you.");
      setRatingModal(null);
      setRatingVal(5);
      setFeedback("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });

      // Sort client-side to avoid composite index error
      fetched.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setOrders(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Orders snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-agri-green animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <ShoppingBag className="w-20 h-20 text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Please Login</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to view your orders.</p>
        <Link href="/login" className="bg-agri-green hover:bg-agri-dark text-white px-8 py-3 rounded-xl font-bold transition-all">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-2">Track and manage your recent purchases.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't placed any orders.</p>
            <Link href="/" className="bg-agri-green hover:bg-agri-dark text-white px-8 py-3 rounded-xl font-bold transition-all inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={order.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 uppercase font-bold tracking-wide">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-1 text-gray-600 text-sm font-medium">
                      <Calendar size={14} />
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : "Processing..."}
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block w-fit shadow-sm border ${
                      order.status === 'Accepted' ? 'bg-green-50 text-green-700 border-green-100' :
                      order.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                      {order.status || "Pending"}
                    </span>
                    <span className="text-xl font-black text-emerald-600">₹{order.total}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Ordered Item</h4>
                  
                  {/* Handle new schema (single item per order) or old schema (array of items) */}
                  {order.productName ? (
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{order.productName}</p>
                        {order.farmerName && <p className="text-xs text-gray-500 font-medium">Farmer: {order.farmerName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-500 bg-white px-2 py-1 rounded-md mb-1 inline-block border border-gray-200 shadow-sm">Qty: {order.quantity}</p>
                        <p className="font-black text-gray-900 block">₹{order.total}</p>
                      </div>
                    </div>
                  ) : order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                      <div>
                        <p className="font-bold text-gray-800 text-lg">{item.name}</p>
                        {item.farmerName && <p className="text-xs text-gray-500 font-medium">Farmer: {item.farmerName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-500 bg-white px-2 py-1 rounded-md mb-1 inline-block border border-gray-200 shadow-sm">Qty: {item.quantity}</p>
                        <p className="font-black text-gray-900 block">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}

                  {order.deliveryTime && order.status === 'Accepted' && (
                    <div className="mt-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-800 text-sm font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Estimated Delivery: {order.deliveryTime}
                    </div>
                  )}
                  
                  {/* Rating button - if Delivered or Accepted (for demo) */}
                  {(order.status === 'Accepted' || order.status === 'Delivered') && order.productId && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                      <button 
                        onClick={() => setRatingModal({ orderId: order.id, productId: order.productId, productName: order.productName })}
                        className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
                      >
                        Rate & Feedback
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Rate Product</h3>
            <p className="text-gray-500 text-sm mb-6">How was your experience with <strong>{ratingModal.productName}</strong>?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingVal(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${ratingVal >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea 
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Leave some feedback for the farmer (optional)..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 mb-6 resize-none h-24"
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setRatingModal(null)} 
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitRating} 
                disabled={submittingRating}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submittingRating ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
