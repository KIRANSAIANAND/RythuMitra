"use client";

import { useState, useEffect } from "react";
import { LogIn, Mail, Lock, AlertCircle, Phone, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Login() {
  const [authMethod, setAuthMethod] = useState("email"); // "email" or "phone"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, loginWithGoogle, setupRecaptcha, loginWithPhone } = useAuth();
  const router = useRouter();

  // Reset confirmation when switching methods
  useEffect(() => {
    setConfirmationResult(null);
    setError("");
  }, [authMethod]);

  const routeUser = async (uid, defaultRole="farmer", defaultName="", defaultEmail="", defaultPhone="") => {
    try {
      const userRef = doc(db, "users", uid);
      const userDoc = await getDoc(userRef);
      
      let role = defaultRole;
      if (userDoc.exists()) {
        role = userDoc.data().role || defaultRole;
      } else {
        // If they login but don't exist in Firestore, create them
        await setDoc(userRef, {
          name: defaultName || "User",
          email: defaultEmail,
          phone: defaultPhone,
          role: defaultRole,
          createdAt: new Date().toISOString()
        });
      }

      if (role === "consumer") {
        router.push("/");
      } else {
        router.push("/farmer/dashboard");
      }
    } catch (err) {
      console.error("Error routing user:", err);
      router.push("/"); // fallback
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await login(email, password);
      await routeUser(userCredential.user.uid, "farmer", "", email, "");
    } catch (err) {
      setError("Failed to sign in. Please check your credentials.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await loginWithGoogle();
      await routeUser(
        userCredential.user.uid, 
        "farmer", 
        userCredential.user.displayName, 
        userCredential.user.email, 
        ""
      );
    } catch (err) {
      setError("Failed to sign in with Google.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const appVerifier = setupRecaptcha("recaptcha-container");
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
      // Reset reCAPTCHA so they can try again
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
      await routeUser(userCredential.user.uid, "farmer", "", "", userCredential.user.phoneNumber);
    } catch (err) {
      setError("Invalid OTP. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-agri-dark skew-y-6 transform -translate-y-24 z-0 shadow-2xl"></div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center p-1 border-4 border-agri-green">
            <img src="/images1.jpg" alt="Logo" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-agri-light/80">
          Or <Link href="/signup" className="font-medium text-white hover:text-agri-green underline">create a new account</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 p-3 rounded-lg flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={16} /> <span className="flex-1">{error}</span>
            </div>
          )}
          
          {/* Invisible Recaptcha Container */}
          <div id="recaptcha-container"></div>

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
            <form className="space-y-6" onSubmit={handleEmailLogin}>
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
                    placeholder="user@example.com"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-200 rounded-xl focus:ring-agri-green focus:border-agri-green outline-none transition-all text-black bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-agri-green focus:ring-agri-green border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-agri-green hover:text-agri-dark">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-agri-green hover:bg-agri-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <span className="animate-spin text-xl">◌</span> : <LogIn size={20} />}
                Sign in with Email
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {!confirmationResult ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
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
                      className="w-2/3 flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-agri-green hover:bg-agri-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-green transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? <span className="animate-spin text-xl">◌</span> : "Verify & Login"}
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
                onClick={handleGoogleLogin}
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

