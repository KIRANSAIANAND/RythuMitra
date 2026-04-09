"use client";

import { ShoppingCart, Star, Check, Leaf, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rated, setRated] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please log in to rate."); return; }
    if (!rating) { alert("Please select a star rating."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, userId: user.uid, rating, feedback })
      });
      if (!res.ok) throw new Error("Failed");
      setRated(true);
      setTimeout(() => { setShowRating(false); setRated(false); }, 2000);
    } catch {
      alert("Could not submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative block group h-full">
      <Link href={`/product/${product.id}`} className="block h-full">
        <motion.div
          className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full"
          whileHover={{ y: -5 }}
        >
          <div className="relative h-48 overflow-hidden bg-gray-100 shrink-0">
            <img
              src={product.imageUrl || product.image || "/images1.jpg"}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-0 bg-gradient-to-r from-green-500 to-green-600 px-3 py-1 text-xs font-black tracking-wide text-white shadow-md rounded-r-lg flex items-center gap-1 uppercase">
              <Leaf size={14} fill="currentColor" />
              AI Freshness: {product.freshness || product.freshnessScore || 95}%
            </div>
          </div>

          <div className="p-5 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-agri-dark line-clamp-1">{product.name}</h3>
              <span className="font-extrabold text-lg text-agri-green">₹{product.price}</span>
            </div>

            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.description}</p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-agri-light flex items-center justify-center text-agri-dark font-bold text-xs">
                  {(product.farmerName || "F").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-600 font-medium truncate max-w-[100px]">
                  {product.farmerName || "Local Farmer"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Rate button */}
                <button
                  onClick={e => { e.preventDefault(); setShowRating(v => !v); }}
                  className="p-2 rounded-full text-yellow-400 hover:bg-yellow-50 transition-colors"
                  title="Rate this product"
                >
                  <Star size={16} fill={showRating ? "currentColor" : "none"} />
                </button>
                {/* Add to cart */}
                <button
                  onClick={handleAdd}
                  disabled={added}
                  className={`${added ? "bg-agri-dark text-white" : "bg-agri-light hover:bg-agri-green text-agri-green hover:text-white"} p-2 rounded-full transition-colors shrink-0`}
                >
                  {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Rating panel */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-20"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold text-gray-800">Rate this product</p>
              <button onClick={() => setShowRating(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            {rated ? (
              <div className="text-center py-2">
                <Check className="text-emerald-500 w-8 h-8 mx-auto mb-1" />
                <p className="text-sm font-bold text-grayald-700">Thanks for your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit}>
                <div className="flex gap-1 mb-3 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s} type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={`transition-colors ${s <= (hoverRating || rating) ? "text-yellow-400" : "text-gray-300"}`}
                        fill={s <= (hoverRating || rating) ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Optional feedback…"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-yellow-300 mb-3 text-gray-800"
                />
                <button
                  type="submit"
                  disabled={submitting || !rating}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  Submit Rating
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
