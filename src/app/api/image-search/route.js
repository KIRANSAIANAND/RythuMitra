import { NextResponse } from "next/server";

/**
 * GET /api/image-search?query=buffalo+milk+fresh
 * Returns { imageUrl: "https://..." }
 *
 * Priority:
 *  1. Pexels API (PEXELS_API_KEY in env) – high quality, food photos
 *  2. Unsplash API (UNSPLASH_ACCESS_KEY in env)
 *  3. Pixabay API (PIXABAY_KEY in env)
 *  4. Picsum seeded fallback (always works, no auth)
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "fresh produce food";

  try {
    // ── Pexels ──────────────────────────────────────────────────────────────
    const PEXELS_KEY = process.env.PEXELS_API_KEY;
    if (PEXELS_KEY) {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY } }
      );
      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        const photo = data.photos[0];
        return NextResponse.json({ imageUrl: photo.src.large });
      }
    }

    // ── Unsplash ─────────────────────────────────────────────────────────────
    const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
    if (UNSPLASH_KEY) {
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${UNSPLASH_KEY}`
      );
      const data = await res.json();
      if (data.urls && data.urls.regular) {
        return NextResponse.json({ imageUrl: data.urls.regular });
      }
    }

    // ── Pixabay ──────────────────────────────────────────────────────────────
    const PIXABAY_KEY = process.env.PIXABAY_KEY;
    if (PIXABAY_KEY) {
      const res = await fetch(
        `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&category=food&per_page=5&orientation=horizontal`
      );
      const data = await res.json();
      if (data.hits && data.hits.length > 0) {
        return NextResponse.json({ imageUrl: data.hits[0].largeImageURL });
      }
    }

    // ── Picsum Fallback (always works, deterministic seed) ────────────────────
    // Hash query to a consistent number for same product → same image
    let seed = 0;
    for (let i = 0; i < query.length; i++) {
      seed = ((seed << 5) - seed) + query.charCodeAt(i);
      seed = seed & seed;
    }
    const positiveSeed = Math.abs(seed) % 1000;
    const imageUrl = `https://picsum.photos/seed/${positiveSeed}/800/600`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image search error:", error);
    const fallbackSeed = Math.abs(query.charCodeAt(0) * 37 + query.charCodeAt(query.length - 1)) % 1000;
    return NextResponse.json({ imageUrl: `https://picsum.photos/seed/${fallbackSeed}/800/600` });
  }
}
