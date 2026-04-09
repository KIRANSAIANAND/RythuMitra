import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, collection, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * POST /api/rate
 * Body: { productId, userId, rating (1-5), feedback? }
 * Saves rating to: ratings/{productId}/reviews/{userId}
 * If >30% of ratings are ≤2, marks product as autoRemoved: true
 */
export async function POST(req) {
  try {
    const { productId, userId, rating, feedback = "" } = await req.json();

    if (!productId || !userId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }

    // Save rating
    const reviewRef = doc(db, "ratings", productId, "reviews", userId);
    await setDoc(reviewRef, {
      rating: Number(rating),
      feedback,
      createdAt: serverTimestamp()
    });

    // Check threshold: if >30% ratings are ≤2, auto-remove
    const reviewsSnap = await getDocs(collection(db, "ratings", productId, "reviews"));
    const allRatings = [];
    reviewsSnap.forEach(d => allRatings.push(d.data().rating));

    const lowCount = allRatings.filter(r => r <= 2).length;
    const pct = allRatings.length > 0 ? (lowCount / allRatings.length) : 0;

      if (allRatings.length >= 5 && pct > 0.3) {
        // Auto-remove the product due to low ratings
        await updateDoc(doc(db, "products", productId), {
          autoRemoved: true,
          autoRemovedReason: `${Math.round(pct * 100)}% of ratings were ≤2 stars`
        });
      }

    return NextResponse.json({ success: true, totalRatings: allRatings.length });
  } catch (error) {
    console.error("Rate API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
