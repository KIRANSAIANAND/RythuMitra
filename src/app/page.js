"use client";

import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { Mic, Search, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Use onSnapshot for real-time updates; filter out auto-removed products
    const q = collection(db, "products");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.autoRemoved) {
          fetched.push({ id: doc.id, ...data });
        }
      });
      fetched.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setProducts(fetched.slice(0, 8));
      setLoading(false);
    }, (err) => {
      console.error("Products snapshot error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-agri-light to-white pt-16 pb-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agri-light border border-agri-green/20 text-agri-dark text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-agri-green animate-pulse"></span>
                AI-Powered Farmer Marketplace
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
                Fresh From Farm,<br />
                <span className="text-agri-green">Direct to You.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
                Empowering farmers through voice AI. Access the freshest, AI-verified produce at fair prices.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for fresh produce..." 
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-agri-green focus:border-transparent shadow-sm bg-white text-black"
                  />
                </div>
                <button className="bg-agri-dark hover:bg-black text-white px-8 py-4 rounded-xl font-medium transition-colors shadow-md">
                  Search
                </button>
              </div>
            </div>
            
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-agri-green/10 rounded-[3rem] rotate-3 scale-105 transition-transform"></div>
              <img 
                src="/images1.jpg" 
                alt="Farm Fresh" 
                className="rounded-[3rem] object-cover h-[500px] w-full shadow-2xl relative z-10 border-8 border-white"
              />
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl z-20 flex items-center gap-4 animate-bounce">
                <div className="bg-agri-light p-3 rounded-full text-agri-green">
                  <Mic size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">For Farmers</p>
                  <p className="text-sm font-bold text-gray-900">List with Voice AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Fresh Arrivals</h2>
            <p className="text-gray-500">AI-verified quality produce picked just for you</p>
          </div>
          <Link href="/products" className="text-agri-green font-medium hover:text-agri-dark flex items-center gap-1 cursor-pointer">
            View All <ChevronRight size={16} />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-agri-green" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.filter(p => (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">No fresh arrivals yet!</h3>
            <p className="text-gray-500 mb-6">Be the first farmer to list your produce via voice.</p>
            <Link href="/farmer/add-product" className="inline-flex bg-agri-green hover:bg-agri-dark text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Add Your Produce
            </Link>
          </div>
        )}
      </section>
      
      {/* Farmer CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-agri-dark rounded-3xl p-10 md:p-16 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 hidden md:block"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Are you a farmer?</h2>
            <p className="text-agri-light/80 text-lg mb-8 max-w-xl">
              List your produce using just your voice. Our AI will automatically translate your speech into a detailed product description, assess quality, and make it available to thousands of customers immediately.
            </p>
            <Link href="/farmer/add-product" className="inline-flex bg-agri-green hover:bg-white text-white hover:text-agri-dark px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl items-center gap-2">
              <Mic size={20} />
              Start Selling with Voice First
            </Link>
          </div>
          
          <div className="relative z-10">
            <div className="w-48 h-48 bg-agri-green/20 rounded-full border border-agri-green/40 flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center animate-ping opacity-20 bg-agri-green rounded-full"></div>
              <Mic className="text-white w-20 h-20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
