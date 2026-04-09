"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Volume2,
  Camera, Upload, ArrowRight, RefreshCcw, Languages, Star,
  ShoppingBag, Clock, TrendingUp, Leaf
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

const LANG_MAP = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
const LANG_LABELS = { en: "English", hi: "हिंदी", te: "తెలుగు" };

// ─── Tiny helpers ───────────────────────────────────────────────────────────

function DemandBadge({ level }) {
  const color = level === "High"
    ? "bg-green-100 text-green-700"
    : level === "Medium"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{level}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AddProductVoice() {
  const { user } = useAuth();
  const router = useRouter();

  // ── Core State ──────────────────────────────────────────────────────────
  const [language, setLanguage] = useState("en");
  const [stage, setStage] = useState("intro"); // intro | chat | image | processing | review | confirm | done
  const [conversationHistory, setConversationHistory] = useState([]); // [{role, content}]
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [pendingAnswer, setPendingAnswer] = useState(""); // not yet confirmed
  const [textInput, setTextInput] = useState(""); // manual text input field

  // ── Voice State ─────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Image State ─────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // ── AI Result ───────────────────────────────────────────────────────────
  const [aiResult, setAiResult] = useState(null);
  const [formData, setFormData] = useState({ name: "", quantity: "", price: "", description: "" });

  // ── UI State ────────────────────────────────────────────────────────────
  const [error, setError] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);

  // ── Stable Refs ─────────────────────────────────────────────────────────
  const recognitionRef = useRef(null);
  const languageRef = useRef(language);
  const pendingAnswerRef = useRef(pendingAnswer);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { pendingAnswerRef.current = pendingAnswer; }, [pendingAnswer]);

  // ── Speech Recognition Setup (once) ────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setPendingAnswer(transcript);
      pendingAnswerRef.current = transcript;
    };

    rec.onend = () => setIsListening(false);
    rec.onerror = (e) => {
      if (e.error !== "no-speech") console.error("Recognition error:", e.error);
      setIsListening(false);
    };

    return () => {
      try { rec.stop(); } catch(e) {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Sync recognition language ───────────────────────────────────────────
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_MAP[language] || "en-IN";
    }
  }, [language]);

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speakText = useCallback((text, onDone) => {
    if (!text || typeof window === "undefined") { onDone?.(); return; }
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const lang = languageRef.current;
    const langPrefix = lang === "en" ? "en" : lang === "hi" ? "hi" : "te";
    const suitableVoice = voices.find(v => v.lang.startsWith(langPrefix))
      || voices.find(v => v.lang.startsWith("en"));
    if (suitableVoice) utterance.voice = suitableVoice;
    utterance.rate = 0.95;
    utterance.onend = () => { setIsSpeaking(false); onDone?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setPendingAnswer("");
    pendingAnswerRef.current = "";
    try { recognitionRef.current.start(); setIsListening(true); } catch(e) {}
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch(e) {}
    setIsListening(false);
  }, []);

  // ── Fetch next AI question ──────────────────────────────────────────────
  const fetchNextQuestion = useCallback(async (history, lang) => {
    setIsFetchingQuestion(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, language: lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat API failed");

      if (data.isComplete) {
        // Move to image capture stage, store summary for analysis
        setConversationHistory(prev => [...prev, { role: "_summary", content: data.summary }]);
        setStage("image");
      } else {
        setCurrentQuestion(data.nextQuestion);
        setStage("chat");
        speakText(data.nextQuestion, startListening);
      }
    } catch (err) {
      setError("Could not get next question: " + err.message);
    } finally {
      setIsFetchingQuestion(false);
    }
  }, [speakText, startListening]);

  // ── Start conversation ──────────────────────────────────────────────────
  const startFlow = () => {
    setConversationHistory([]);
    setPendingAnswer("");
    setTextInput("");
    setAiResult(null);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    fetchNextQuestion([], language);
  };

  // ── Confirm pending answer and advance ──────────────────────────────────
  const confirmAnswer = () => {
    const answer = pendingAnswer || textInput;
    if (!answer.trim()) return;

    stopListening();
    window.speechSynthesis.cancel();

    const newHistory = [
      ...conversationHistory.filter(h => h.role !== "_summary"),
      { role: "assistant", content: currentQuestion },
      { role: "user", content: answer }
    ];
    setConversationHistory(prev => [
      ...prev,
      { role: "assistant", content: currentQuestion },
      { role: "user", content: answer }
    ]);
    setPendingAnswer("");
    setTextInput("");
    fetchNextQuestion(newHistory, language);
  };

  // ── Re-record answer ────────────────────────────────────────────────────
  const reRecord = () => {
    stopListening();
    setPendingAnswer("");
    setTextInput("");
    setTimeout(() => speakText(currentQuestion, startListening), 300);
  };

  // ── Image handler ───────────────────────────────────────────────────────
  const handleImageCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Trigger AI analysis ─────────────────────────────────────────────────
  const triggerAnalysis = async () => {
    setStage("processing");
    setError(null);

    const summaryEntry = conversationHistory.find(h => h.role === "_summary");
    const userMessages = conversationHistory
      .filter(h => h.role === "user")
      .map(h => h.content)
      .join(". ");
    const combinedText = summaryEntry?.content || userMessages || "Unknown product";

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: combinedText,
          targetLanguage: language,
          imageHint: imageFile ? `User uploaded an image of the product (${imageFile.name})` : ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAiResult(data.result);
      
      const parsedName = data.result.name || "";
      const parsedVariant = data.result.variant && data.result.variant !== "Standard" ? data.result.variant : "";
      const imageSearchQuery = [parsedVariant, parsedName, "fresh produce food"].filter(Boolean).join(" ");

      if (!imageFile && parsedName) {
        // Use server-side proxy to reliably fetch product image
        fetch(`/api/image-search?query=${encodeURIComponent(imageSearchQuery)}`)
          .then(r => r.json())
          .then(imgData => { if (imgData.imageUrl) setImagePreview(imgData.imageUrl); })
          .catch(() => {}); // silent fail, preview just stays empty
      }

      // CRITICAL: Use the farmer's OWN price from the conversation, never override it
      // The AI price field is the farmer's stated price (we instruct it to preserve it).
      // formData.price is populated FROM the conversation summary, not from AI suggestion.
      const farmerPrice = data.result.price || "";

      setFormData({
        name: parsedName,
        quantity: data.result.quantity || "",
        price: farmerPrice,  // Farmer price is final - NEVER use suggestedPrice here
        description: data.result.description || ""
      });
      setStage("review");
      speakText(
        language === "hi" ? "विश्लेषण पूरा हुआ। क्या आप इस उत्पाद को प्रकाशित करना चाहते हैं?"
        : language === "te" ? "విశ్లేషణ పూర్తయింది. మీరు ఈ ఉత్పత్తిని ప్రచురించాలనుకుంటున్నారా?"
        : "Analysis complete. Do you want to publish this product?",
        null
      );
    } catch (err) {
      setError("Analysis failed: " + err.message);
      setStage("image");
    }
  };

  // ── Publish product ─────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!user) { setError("Please log in to publish."); return; }
    setIsPublishing(true);
    setError(null);

    try {
      let imageUrl = null;

      // Upload image to Firebase Storage if available
      if (imageFile) {
        const storagePath = `products/${user.uid}/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      } else {
        if (imagePreview) {
          imageUrl = imagePreview;
        } else {
          // Fetch via server-side proxy synchronously
          const imgQuery = [aiResult?.variant, aiResult?.name, "fresh food produce"].filter(Boolean).join(" ");
          try {
            const imgRes = await fetch(`/api/image-search?query=${encodeURIComponent(imgQuery)}`);
            const imgData = await imgRes.json();
            imageUrl = imgData.imageUrl || null;
          } catch { imageUrl = null; }
        }
      }

      await addDoc(collection(db, "products"), {
        ...aiResult,
        name: formData.name,
        quantity: formData.quantity,
        price: Number(String(formData.price).replace(/[^0-9.]/g, "") || 0),
        description: formData.description,
        farmerId: user.uid,
        farmerName: user.profile?.name || user.displayName || user.email,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        aiVerified: true,
        status: "active",
        autoRemoved: false
      });

      setStage("done");
      setTimeout(() => router.push("/farmer/dashboard"), 2500);
    } catch (err) {
      console.error("Publish error:", err);
      setError("Failed to publish: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const resetFlow = () => {
    setStage("intro");
    setConversationHistory([]);
    setPendingAnswer("");
    setTextInput("");
    setCurrentQuestion("");
    setAiResult(null);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  // ─── Progress indicator ─────────────────────────────────────────────────
  const stageOrder = ["intro", "chat", "image", "processing", "review", "confirm"];
  const chatTurns = conversationHistory.filter(h => h.role === "user").length;
  const totalEstimated = 4;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2 border border-red-200"
        >
          <AlertCircle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── INTRO ────────────────────────────────────────────── */}
        {stage === "intro" && (
          <motion.div key="intro"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="text-emerald-600 w-10 h-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                List Your Produce with Voice AI
              </h1>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Our AI will ask you a few natural questions. Speak or type your answers. 
                We'll generate a complete listing automatically.
              </p>

              {/* Language Selector */}
              <div className="mb-8 max-w-xs mx-auto">
                <label className="block text-sm font-bold text-gray-700 mb-3 text-left flex items-center gap-2">
                  <Languages size={16} /> Select Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(LANG_LABELS).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setLanguage(id)}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        language === id
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startFlow}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-sm py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 mx-auto"
              >
                Start Conversation <ArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── CHAT: ask → confirm loop ─────────────────────────── */}
        {stage === "chat" && (
          <motion.div key="chat"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-gray-100"
          >
            {/* Progress */}
            <div className="flex gap-1.5 mb-8">
              {Array.from({ length: totalEstimated }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    i < chatTurns ? "bg-emerald-500" : i === chatTurns ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Language selector (compact) */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Question {chatTurns + 1}</span>
              <div className="flex gap-1">
                {Object.entries(LANG_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setLanguage(id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      language === id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question */}
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 leading-snug">
              {isFetchingQuestion ? (
                <span className="text-gray-400 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={24} /> Thinking...
                </span>
              ) : currentQuestion}
            </h2>

            {/* TTS speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-full w-fit mb-6">
                <Volume2 className="text-blue-500 w-4 h-4 animate-pulse" />
                <span className="text-blue-600 text-sm font-bold">Speaking...</span>
              </div>
            )}

            {/* Mic Button */}
            <div className="flex flex-col items-center mb-8">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking || isFetchingQuestion}
                className={`w-28 h-28 rounded-full flex items-center justify-center relative shadow-2xl transition-colors ${
                  isSpeaking || isFetchingQuestion
                    ? "bg-gray-100 cursor-not-allowed"
                    : isListening
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isListening && (
                  <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-30" />
                )}
                {isListening
                  ? <MicOff className="text-white w-12 h-12 relative z-10" />
                  : <Mic className={`w-14 h-14 ${isSpeaking ? "text-gray-300" : "text-white"}`} />
                }
              </motion.button>
              <span className="text-sm text-gray-400 mt-3 font-medium">
                {isListening ? "Listening… tap to stop" : "Tap to speak"}
              </span>
            </div>

            {/* Transcript / Text Input */}
            <div className="mb-6 space-y-3">
              {/* Voice transcript preview */}
              {pendingAnswer && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
                  <p className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-wide">You said:</p>
                  <p className="text-gray-800 font-medium text-lg">"{pendingAnswer}"</p>
                </div>
              )}

              {/* Text input fallback */}
              <div className="relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmAnswer()}
                  placeholder="Or type your answer here…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 font-medium placeholder-gray-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={reRecord}
                disabled={isSpeaking}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium transition-all disabled:opacity-40"
              >
                <RefreshCcw size={16} /> Re-record
              </button>
              <button
                onClick={confirmAnswer}
                disabled={!pendingAnswer && !textInput.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all"
              >
                Confirm & Next <ArrowRight size={18} />
              </button>
            </div>

            {/* Conversation history */}
            {conversationHistory.filter(h => h.role === "user").length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-3">Your Answers So Far</p>
                <div className="space-y-2">
                  {conversationHistory.filter(h => h.role === "user").map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                      <span className="text-gray-600">{h.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── IMAGE CAPTURE ────────────────────────────────────── */}
        {stage === "image" && (
          <motion.div key="image"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="text-emerald-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Add a Product Photo</h2>
            <p className="text-gray-500 mb-8">A clear photo helps buyers trust your produce and gets better AI analysis.</p>

            <div className="mb-8">
              {imagePreview ? (
                <div className="relative max-w-sm mx-auto">
                  <img src={imagePreview} alt="Product" className="w-full h-64 object-cover rounded-2xl shadow-md" />
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                    <span className="text-white font-bold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-xl">
                      <Camera size={18} /> Retake Photo
                    </span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-52 max-w-sm mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <Camera className="text-gray-400 w-10 h-10 mb-3" />
                  <span className="font-bold text-gray-600">Tap to take photo / upload</span>
                  <span className="text-gray-400 text-sm mt-1">PNG, JPG up to 10MB</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                </label>
              )}
            </div>

            <div className="flex gap-3 max-w-sm mx-auto">
              <button
                onClick={triggerAnalysis}
                className="flex-1 border border-gray-200 py-3 rounded-xl text-gray-500 font-medium hover:bg-gray-50 transition-colors"
              >
                Skip Photo
              </button>
              <button
                onClick={triggerAnalysis}
                disabled={!imagePreview}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all"
              >
                Analyze Now <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── PROCESSING ──────────────────────────────────────── */}
        {stage === "processing" && (
          <motion.div key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-white rounded-3xl p-16 shadow-xl border border-gray-100 text-center"
          >
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analyzing your produce…</h2>
            <p className="text-gray-500">AI is generating freshness score, shelf life, demand level, and pricing.</p>
          </motion.div>
        )}

        {/* ─── REVIEW ──────────────────────────────────────────── */}
        {stage === "review" && aiResult && (
          <motion.div key="review"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <CheckCircle2 className="text-emerald-600 w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Review Your Listing</h2>
                <p className="text-gray-500 text-sm">Edit any field before confirming.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 text-black">
              {/* Left: Fields */}
              <div className="space-y-5">
                {imagePreview && (
                  <div className="relative group">
                    <img src={imagePreview} alt="Product" className="w-full h-48 object-cover rounded-2xl shadow-sm" />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer">
                      <span className="text-white font-bold"><Camera size={20} className="inline mr-1"/> Change</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                    </label>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Product Name</label>
                  <input type="text" value={formData.name + (aiResult.variant && aiResult.variant !== "Standard" ? ` (${aiResult.variant})` : "")}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quantity</label>
                    <input type="text" value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      className="mt-1 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Farmer Price (₹)</label>
                  <input type="text" value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    placeholder="e.g. 250"
                  />
                  {aiResult.marketPriceRange && (
                    <p className="mt-1 text-xs text-gray-400">Market range: <strong className="text-gray-600">{aiResult.marketPriceRange}</strong></p>
                  )}
                  </div>
                </div>

                {/* AI Analysis Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                      <Leaf size={12} /> Freshness
                    </p>
                    <p className="text-2xl font-black text-emerald-700">{aiResult.freshness}%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                      <Clock size={12} /> Shelf Life
                    </p>
                    <p className="text-sm font-black text-blue-700">{aiResult.shelfLife || "—"}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                      <TrendingUp size={12} /> Demand
                    </p>
                    <DemandBadge level={aiResult.demandLevel || "Medium"} />
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${
                    aiResult.priceComparison === 'Higher' ? 'bg-amber-50 border-amber-100' :
                    aiResult.priceComparison === 'Lower' ? 'bg-green-50 border-green-100' :
                    'bg-purple-50 border-purple-100'
                  }`}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1" style={{color: aiResult.priceComparison === 'Higher' ? '#d97706' : aiResult.priceComparison === 'Lower' ? '#16a34a' : '#7c3aed'}}>
                      ₹ Vs Market
                    </p>
                    <p className={`text-sm font-black ${ aiResult.priceComparison === 'Higher' ? 'text-amber-700' : aiResult.priceComparison === 'Lower' ? 'text-green-700' : 'text-purple-700'}`}>
                      {aiResult.priceComparison || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: AI Description + Tips */}
              <div className="space-y-4">
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex-1">
                  <label className="flex justify-between text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">
                    <span>AI Description ({LANG_LABELS[language]})</span>
                    <span className="bg-white px-2 py-0.5 rounded-full text-emerald-600">{language.toUpperCase()}</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full p-4 rounded-xl border border-emerald-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium text-gray-700 leading-relaxed"
                  />
                </div>
                {aiResult.priceAdvice && (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">💰 Price Analysis</p>
                    <p className="text-sm text-indigo-900 font-medium leading-relaxed">{aiResult.priceAdvice}</p>
                  </div>
                )}
                {aiResult.marketTrend && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1"><TrendingUp size={14}/> Market Trend</p>
                    <p className="text-sm text-blue-900 font-medium leading-relaxed">{aiResult.marketTrend}</p>
                  </div>
                )}
                {aiResult.sellingRecommendation && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1"><CheckCircle2 size={14}/> Recommendation</p>
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">{aiResult.sellingRecommendation}</p>
                  </div>
                )}
                {aiResult.storageTips && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">💡 Storage Tips</p>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">{aiResult.storageTips}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
              <button onClick={resetFlow} className="text-gray-500 hover:text-gray-800 font-bold px-6 py-3 transition-colors">
                ← Start Over
              </button>
              <button
                onClick={() => setStage("confirm")}
                className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
              >
                <Upload size={20} /> Review & Publish
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── CONFIRM ─────────────────────────────────────────── */}
        {stage === "confirm" && aiResult && (
          <motion.div key="confirm"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">Do you want to publish this product?</h2>
            <p className="text-gray-500 text-center mb-8">Your listing will be live in the marketplace immediately.</p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-3 mb-8 border border-gray-100 text-sm">
              {imagePreview && <img src={imagePreview} alt="product" className="w-full h-40 object-cover rounded-xl mb-4" />}
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Product</span><span className="font-bold text-gray-900">{formData.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Quantity</span><span className="font-bold">{formData.quantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Price</span><span className="font-bold text-emerald-600">₹{formData.price}/kg</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Freshness</span><span className="font-bold text-emerald-600">{aiResult.freshness}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-medium">Shelf Life</span><span className="font-bold">{aiResult.shelfLife}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Demand</span><DemandBadge level={aiResult.demandLevel} /></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStage("review")} className="flex-1 border border-gray-200 py-4 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">
                ← Edit
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {isPublishing ? "Publishing…" : "Yes, Publish Now!"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── DONE ────────────────────────────────────────────── */}
        {stage === "done" && (
          <motion.div key="done"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-3xl p-16 text-center shadow-xl"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-gray-900 mb-2">Published! 🎉</h2>
            <p className="text-gray-600">Your product is now live in the marketplace. Redirecting to dashboard…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
