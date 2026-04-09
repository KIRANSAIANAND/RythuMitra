import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { text, targetLanguage = "en", imageHint = "" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return NextResponse.json({
        result: {
          name: "Mock Product",
          variant: "Standard",
          quantity: "100 kg",
          price: "100",
          suggestedPrice: "120",
          freshness: 90,
          shelfLife: "3-5 days",
          demandLevel: "High",
          marketTrend: "Prices are stable today.",
          sellingRecommendation: "List the product immediately.",
          description: `You said: "${text}". Please add GROQ_API_KEY to .env.local for real AI.`,
          storageTips: "Store in a cool dry place.",
          language: targetLanguage
        }
      });
    }

    const imageContext = imageHint
      ? `\nAdditional visual context from the product image: ${imageHint}`
      : "";

    const prompt = `
      You are an expert Agriculture Market Intelligence AI for RythuMitra, an Indian agri-marketplace.
      A farmer described their product as follows:
      "${text}"
      ${imageContext}

      CRITICAL RULES (NEVER BREAK THESE):
      1. NEVER override the farmer's given price. Their price is the FINAL selling price.
      2. Extract the exact price the farmer mentioned. If they said ₹250/liter, return "250" as price. DO NOT change it.
      3. Simulate REALISTIC Indian market conditions specific to the product type and variant.
      4. All prices must be in Indian Rupees (₹). Reference real 2024-2025 Indian mandi/retail ranges.

      MARKET COMPARISON LOGIC:
      - Research the typical price range for this product in India (e.g., buffalo milk ₹70-90/liter, Shimla apples ₹150-200/kg).
      - Compare the farmer's price to this range.
      - If farmer price is within range: say "Market rate is ₹X-₹Y. Your price is competitive."
      - If higher: say "Market rate is ₹X-₹Y. Your price is slightly higher. Justifiable if quality is premium."
      - If lower: say "Market rate is ₹X-₹Y. You are priced below market — consider increasing for better margins."

      Generate the 'description' and 'storageTips' EXCLUSIVELY in language code: "${targetLanguage}" (en=English, te=Telugu, hi=Hindi).

      Respond ONLY with this exact JSON (no extra text, no markdown):
      {
        "name": "Product name in English",
        "variant": "Product variant/type if mentioned (e.g. 'Buffalo Milk', 'Shimla Apple'). Else 'Standard'",
        "quantity": "Extracted exact quantity with correct unit (e.g. 10 Liters, 50 kg, 6 Bundles)",
        "price": "Farmer's exact price as digit only — DO NOT CHANGE THIS (e.g. 250)",
        "marketPriceRange": "Realistic Indian market price range for this product (e.g. '₹220–₹240/liter')",
        "priceComparison": "Higher | Lower | Competitive",
        "priceAdvice": "1-2 sentences comparing farmer price to market range with practical advice",
        "freshness": <Number 70-99 based on quality/harvest date description>,
        "shelfLife": "Realistic shelf life based on product type and variant",
        "demandLevel": "High | Medium | Low — based on realistic Indian market trends for this specific product",
        "marketTrend": "A realistic 1-sentence simulated market trend for this product in India",
        "sellingRecommendation": "Actionable advice: when to sell, where to sell, how urgently",
        "description": "Engaging 2-3 sentence consumer-facing description in ${targetLanguage} language",
        "storageTips": "Practical storage tip adapted for rural India in ${targetLanguage} language",
        "language": "${targetLanguage}"
      }
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const result = JSON.parse(data.choices[0].message.content);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text with AI", details: error.message },
      { status: 500 }
    );
  }
}
