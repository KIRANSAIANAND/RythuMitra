"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { Package, Clock, CheckCircle2, XCircle, Loader2, Mic, MicOff, Volume2, TrendingUp, Calendar, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const LANG_MAP = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
const LANG_LABELS = { en: "ENGLISH", hi: "हिंदी", te: "తెలుగు" };

export default function FarmerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delivery time modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(null); // orderId
  const [deliveryTimeInput, setDeliveryTimeInput] = useState("");
  const [updating, setUpdating] = useState(false);

  // Voice AI State
  const [language, setLanguage] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiMessage, setAiMessage] = useState("Tap the mic and ask me about your orders! (e.g., 'How many orders today?')");
  const [aiLoading, setAiLoading] = useState(false);
  const recognitionRef = useRef(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, today: 0, mostSold: "-" });

  // ── Fetch Orders ──
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("farmerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));

      // Sort client-side to avoid needing a Firestore composite index
      fetched.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setOrders(fetched);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0,0,0,0);
      let todayCount = 0;
      const productCounts = {};

      fetched.forEach(o => {
        if (o.createdAt && o.createdAt.toDate() >= today) todayCount++;
        const pName = o.productName || "Unknown";
        productCounts[pName] = (productCounts[pName] || 0) + (Number(o.quantity) || 1);
      });

      let topProduct = "-";
      let maxCount = 0;
      for (const [name, count] of Object.entries(productCounts)) {
        if (count > maxCount) { maxCount = count; topProduct = name; }
      }

      setStats({
        total: fetched.length,
        today: todayCount,
        mostSold: topProduct
      });
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ── Action Handlers ──
  const handleAction = async (orderId, status, deliveryTime = null) => {
    setUpdating(true);
    try {
      const updateData = { status };
      if (deliveryTime) updateData.deliveryTime = deliveryTime;
      await updateDoc(doc(db, "orders", orderId), updateData);
      if (showDeliveryModal === orderId) {
        setShowDeliveryModal(null);
        setDeliveryTimeInput("");
      }
    } catch (err) {
      console.error("Failed to update order", err);
      alert("Error updating order: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ── Voice Setup ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;

    rec.onresult = async (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setIsListening(false);
      processVoiceCommand(transcript);
    };

    rec.onerror = (e) => {
      if (e.error !== "no-speech") console.error("Recognition error:", e.error);
      setIsListening(false);
      setAiMessage("Could not hear you. Please try again.");
    };

    rec.onend = () => setIsListening(false);

    return () => {
      try { rec.stop(); } catch(e) {}
      window.speechSynthesis?.cancel();
    };
  }, [orders, language]); // Re-bind when orders or lang changes to have latest state in closure!

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || "en-IN";
    }
  }, [language]);

  const toggleListen = () => {
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch(e) {}
      setIsListening(false);
    } else {
      window.speechSynthesis?.cancel();
      try { recognitionRef.current?.start(); setIsListening(true); } catch(e) {}
      setAiMessage("Listening...");
    }
  };

  const speakText = useCallback((text) => {
    if (!text || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language === "en" ? "en" : language === "hi" ? "hi" : "te";
    const suitableVoice = voices.find(v => v.lang.startsWith(langPrefix)) || voices.find(v => v.lang.startsWith("en"));
    if (suitableVoice) utterance.voice = suitableVoice;
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  // ── AI Processing ──
  const processVoiceCommand = async (transcript) => {
    setAiLoading(true);
    setAiMessage(`Processing: "${transcript}"...`);
    
    try {
      const res = await fetch("/api/ai/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: transcript,
          language,
          ordersData: orders.slice(0, 50), // Send recent orders as context context
          stats
        })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setAiMessage(data.response);
      speakText(data.response);

      // Handle AI Actions (e.g. { action: 'ACCEPT', orderId: 'xyz' })
      if (data.action) {
         if (data.action === "ACCEPT" && data.orderId) {
            // Check if AI included deliveryTime
            if (data.deliveryTime) {
                await handleAction(data.orderId, "Accepted", data.deliveryTime);
            } else {
                setShowDeliveryModal(data.orderId);
            }
         } else if (data.action === "REJECT" && data.orderId) {
             await handleAction(data.orderId, "Rejected");
         }
      }

    } catch (err) {
      setAiMessage("Sorry, I encountered an error: " + err.message);
      speakText("Error processing command.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Farmer Access Only</h2>
        <Link href="/login" className="bg-emerald-600 text-white px-6 py-2 rounded-lg">Log in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Manage Orders</h1>
            <p className="text-gray-500">View and respond to customer orders in real-time.</p>
          </div>
          <Link href="/farmer/dashboard" className="text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600"><Package size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Orders</p>
              <p className="text-3xl font-black text-gray-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-600"><Clock size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Today's Orders</p>
              <p className="text-3xl font-black text-gray-900">{stats.today}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-purple-100 p-4 rounded-full text-purple-600"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Most Sold</p>
              <p className="text-xl font-bold text-gray-900 truncate max-w-[150px]">{stats.mostSold}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
            
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No orders received yet.</p>
              </div>
            ) : (
                orders.map((order) => (
                    <motion.div key={order.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden"
                    >
                        {/* Status Bar Top */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            order.status === 'Accepted' ? 'bg-emerald-500' :
                            order.status === 'Rejected' ? 'bg-red-500' :
                            'bg-amber-400'
                        }`} />
                        
                        <div className="pl-4 flex flex-col md:flex-row justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                        order.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                                        order.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                        {order.status || "Pending"}
                                    </span>
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                                        #{order.id.slice(-6).toUpperCase()}
                                    </span>
                                    <span className="text-gray-500 text-sm flex items-center gap-1">
                                        <Calendar size={14} /> {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : ''}
                                    </span>
                                </div>
                                
                                <h3 className="text-xl font-black text-gray-900 mb-1">{order.productName}</h3>
                                <p className="text-emerald-700 font-bold mb-4">Qty: {order.quantity} <span className="text-gray-400 mx-2">|</span> ₹{order.total}</p>

                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                                    <p className="font-bold text-gray-800 mb-1">{order.customerName}</p>
                                    <p className="text-gray-600 flex items-start gap-1">
                                        <MapPin size={14} className="mt-0.5 text-gray-400" />
                                        {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.pincode}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col gap-2 justify-end min-w-[140px]">
                                {(!order.status || order.status === "Pending") && (
                                    <>
                                        <button 
                                            disabled={updating}
                                            onClick={() => setShowDeliveryModal(order.id)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={18} /> Accept
                                        </button>
                                        <button 
                                            disabled={updating}
                                            onClick={() => handleAction(order.id, "Rejected")}
                                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                    </>
                                )}
                                {order.status === "Accepted" && order.deliveryTime && (
                                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-center text-sm">
                                        <p className="font-bold uppercase tracking-wide text-[10px] mb-1">Delivering In</p>
                                        <p className="font-black">{order.deliveryTime}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))
            )}
          </div>

          {/* AI Assistant Sidebar */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 sticky top-24">
                 
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-emerald-600" />
                        </div>
                        Voice Assistant
                    </h3>
                    
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        {Object.keys(LANG_LABELS).map(l => (
                            <button key={l} onClick={()=>setLanguage(l)} className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${language === l ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className={`p-4 rounded-2xl mb-6 text-sm font-medium leading-relaxed transition-colors ${isListening ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-gray-50 border border-gray-100 text-gray-700'}`}>
                     {aiLoading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> Thinking...</span> : aiMessage}
                     {isSpeaking && <Volume2 className="w-4 h-4 ml-2 inline animate-pulse text-emerald-500" />}
                 </div>

                 <button 
                     onClick={toggleListen}
                     className={`w-full py-4 rounded-2xl font-black flex justify-center items-center gap-2 shadow-md transition-all ${
                         isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                     }`}
                 >
                     {isListening ? <><MicOff size={20}/> Stop Listening</> : <><Mic size={20}/> Tap to Speak</>}
                 </button>

                 <div className="mt-6">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Try asking:</p>
                     <ul className="text-sm text-gray-500 space-y-2 font-medium">
                         <li>"How many orders did I get today?"</li>
                         <li>"Accept the order for Apples, delivery in 2 days"</li>
                         <li>"Reject the Tomato order"</li>
                     </ul>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Delivery Time Modal */}
      <AnimatePresence>
          {showDeliveryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl"
                  >
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Delivery Time</h3>
                      <p className="text-gray-500 text-sm mb-6">When will you deliver this order?</p>
                      
                      <input 
                          autoFocus
                          type="text" 
                          value={deliveryTimeInput}
                          onChange={e => setDeliveryTimeInput(e.target.value)}
                          placeholder="e.g. 2 Days, Tomorrow, 5 Hours..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none text-black focus:ring-2 focus:ring-emerald-500 mb-6"
                          onKeyDown={e => e.key === 'Enter' && deliveryTimeInput.trim() && handleAction(showDeliveryModal, 'Accepted', deliveryTimeInput.trim())}
                      />

                      <div className="flex gap-3">
                          <button onClick={() => setShowDeliveryModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
                              Cancel
                          </button>
                          <button 
                              disabled={!deliveryTimeInput.trim() || updating}
                              onClick={() => handleAction(showDeliveryModal, 'Accepted', deliveryTimeInput.trim())} 
                              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                          >
                              {updating ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : "Confirm"}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}
