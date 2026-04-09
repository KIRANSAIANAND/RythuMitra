"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function FarmerLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user?.profile?.role === "consumer") {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user?.profile?.role === "consumer") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-agri-green animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
