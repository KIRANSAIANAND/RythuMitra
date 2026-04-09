"use client";

import { useState, useEffect } from "react";
import { UserPlus, Mail, Lock, AlertCircle, User, Phone, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function Signup() {
  const [authMethod, setAuthMethod] = useState("email"); // "email" or "phone"
  const [role, setRole] = useState("farmer"); // "farmer" or "consumer"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signup, loginWithGoogle, setupRecaptcha, loginWithPhone } = useAuth();
  const router = useRouter();

  // Reset confirmation when switching methods
  useEffect(() => {
    setConfirmationResult(null);
    setError("");
  }, [authMethod]);

  const routeUser = () => {
    if (role === "consumer") {
      router.push("/");
    } else {
      router.push("/farmer/dashboard");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Create user in Firebase Auth
      const userCredential = await signup(email, password);
      
      // Save profile to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role: role,
        createdAt: new Date().toISOString()
      });

      routeUser();
    } catch (err) {
      setError("Failed to create account. " + err.message);
      console.error(err);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await loginWithGoogle(); // Same popup authenticates the user
      
      // Check if user document already exists, if not, create it
      const userRef = doc(db, "users", userCredential.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          name: userCredential.user.displayName || "Google User",
          email: userCredential.user.email || "",
          role: role,
          createdAt: new Date().toISOString()
        });
        routeUser();
      } else {
        // Already exists, just route based on their existing role
        const existingRole = docSnap.data().role || "farmer";
        if (existingRole === "consumer") {
          router.push("/");
        } else {
          router.push("/farmer/dashboard");
        }
      }
    } catch (err) {
      setError("Failed to sign up with Google.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const appVerifier = setupRecaptcha("recaptcha-container-signup");
      // Ensure phone number has country code. Defaulting to India if none provided.
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await loginWithPhone(formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      if (err.code === "auth/billing-not-enabled") {
        setError("Phone Authentication is disabled. Please upgrade your Firebase project to the Blaze plan to use this feature.");
      } else {
        setError("Failed to send OTP. Ensure phone number is valid format.");
      }
      console.error(err);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await confirmationResult.confirm(otp);
      
      const userRef = doc(db, "users", userCredential.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          name: name || "Phone User", // Fallback if name wasn't entered
          phone: userCredential.user.phoneNumber,
          role: role,
          createdAt: new Date().toISOString()
        });
        routeUser();
      } else {
        // Already exists, route based on existing role
        const existingRole = docSnap.data().role || "farmer";
        if (existingRole === "consumer") {
          router.push("/");
        } else {
          router.push("/farmer/dashboard");
        }
      }
    } catch (err) {
      setError("Invalid OTP. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-agri-dark skew-y-6 transform -translate-y-24 z-0 shadow-2xl"></div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center p-1 border-4 border-agri-green">
            <img src="/images1.jpg" alt="Logo" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Join RythuMitra
        </h2>
        <p className="mt-2 text-center text-sm text-agri-light/80">
          Already have an account? <Link href="/login" className="font-medium text-white hover:text-agri-green underline">Log in here</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 p-3 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} /> <span className="flex-1">{error}</span>
            </div>
          )}
          
          <div id="recaptcha-container-signup"></div>

          {/* Role Selection */}
          <div className="mb-8">
            <p className="block text-sm font-medium text-gray-700 mb-2">I want to join as a:</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRole("farmer")}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  role === "farmer" 
                    ? "border-agri-green bg-agri-green/10 text-agri-dark font-bold" 
                    : "border-gray-200 bg-white text-gray-500 hover:border-agri-green/50"
                }`}
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  role === "consumer" 
                    ? "border-agri-green bg-agri-green/10 text-agri-dark font-bold" 
                    : "border-gray-200 bg-white text-gray-500 hover:border-agri-green/50"
                }`}
              >
                Consumer
              </button>
            </div>
          </div>
          
          {/* Authentication Method Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setAuthMethod("email")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                authMethod === "email" ? "border-agri-green text-agri-green" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Email & Password
            </button>
            <button
              onClick={() => setAuthMethod("phone")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                authMethod === "phone" ? "border-agri-green text-agri-green" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Phone Number
            </button>
          </div>

          {authMethod === "email" ? (
            <form className="space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                    placeholder="Ramesh Reddy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                    placeholder="farmer@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-agri-green hover:bg-agri-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green transition-all"
              >
                {loading ? <span className="animate-spin text-xl">◌</span> : <UserPlus size={20} />}
                Create {role === "farmer" ? "Farmer" : "Consumer"} Account
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {!confirmationResult ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name (optional)</label>
                    <div className="mt-2 relative rounded-xl shadow-sm mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                        placeholder="Ramesh Reddy"
                      />
                    </div>
                    
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="mt-2 relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Include country code (e.g. +91 for India)</p>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !phoneNumber}
                    className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-agri-green hover:bg-agri-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? <span className="animate-spin text-xl">◌</span> : <Smartphone size={20} />}
                    Send OTP SMS
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Enter OTP sent to {phoneNumber}</label>
                    <div className="mt-2 relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white tracking-widest text-lg font-bold"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="w-1/3 py-4 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-2/3 flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-agri-green hover:bg-agri-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green transition-all border-none disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? <span className="animate-spin text-xl">◌</span> : "Verify & Sign Up"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium tracking-wide text-xs uppercase">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Google
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
