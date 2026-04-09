"use client";

import Link from "next/link";
import { ArrowLeft, Star, ShieldCheck, MapPin, Leaf, ShoppingBag, Loader2, Check } from "lucide-react";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { useCart } from "@/context/CartContext";

export default function ProductDetails({ params }) {
  // `params` is a Promise in App Router dynamic segments sometimes, so `use(params)`
  const resolvedParams = use(params);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", resolvedParams.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams.id]);
  
  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-bg-light min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-agri-green" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-bg-light min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
        <Link href="/" className="bg-agri-green text-white px-6 py-3 rounded-xl">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-light min-h-screen pb-20">
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-agri-green transition-colors font-medium">
            <ArrowLeft size={16} /> Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2">
            
            {/* Product Image Area */}
            <div className="relative h-[400px] md:h-full bg-gray-100">
              <img 
                src={product.image || "/images1.jpg"} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold text-agri-green flex items-center gap-2 shadow-lg">
                <Star size={16} fill="currentColor" />
                {product.freshness || product.freshnessScore || 95}% AI Freshness
              </div>
            </div>
            
            {/* Product Info */}
            <div className="p-8 md:p-12">
              <div className="mb-2 flex items-center gap-2">
                <span className="bg-agri-light text-agri-dark text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Fresh Produce
                </span>
                {product.aiVerified !== false && (
                  <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck size={14} /> AI Verified Listing
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{product.name}</h1>
              
              <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                <div className="text-4xl font-black text-agri-green">₹{product.price}</div>
              </div>
              
              <div className="space-y-6 mb-8 text-black">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">{product.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
                    <Leaf className="text-agri-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Storage Tips</p>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2" title={product.storageTips}>{product.storageTips || "Store in cool dry place."}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
                    <MapPin className="text-agri-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Location</p>
                      <p className="font-semibold text-gray-900">Direct From Farm</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-8 p-4 border border-gray-100 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xl uppercase">
                  {(product.farmerName || product.farmerEmail || "F").charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Sold by</p>
                  <p className="font-bold text-gray-900 truncate max-w-[200px]">{product.farmerName || product.farmerEmail || "Local Farmer"}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm text-gray-500 font-medium">Quantity</p>
                  <p className="font-bold text-gray-900">{product.quantity || "Available"}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 ${added ? 'bg-black' : 'bg-agri-green hover:bg-agri-dark'} text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}
                >
                  {added ? (
                    <><Check size={20} /> Added to Cart</>
                  ) : (
                    <><ShoppingBag size={20} /> Add to Cart</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
