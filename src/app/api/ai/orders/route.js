import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { query, language = "en", ordersData = [], stats = {} } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      // Mock mode
      return NextResponse.json({
        response: `I heard: ${query}. (Please set GROQ_API_KEY for real AI processing)`,
        action: null,
        orderId: null,
        deliveryTime: null
      });
    }

    // Minify ordersData to save tokens
    const miniOrders = ordersData.map(o => ({
      id: o.id,
      product: o.productName,
      qty: o.quantity,
      status: o.status || "Pending"
    }));

    const prompt = `
      You are a helpful Voice AI assistant for a farmer on the RythuMitra marketplace.
      
      Language setting for your response text: ${language} (en=English, hi=Hindi, te=Telugu). ALWAYS respond in this language.
      
      Farmer's Query: "${query}"
      
      Current Stats:
      Total Orders: ${stats.total || 0}
      Today's Orders: ${stats.today || 0}
      Most Sold: ${stats.mostSold || "-"}
      
      Recent Orders (JSON):
      ${JSON.stringify(miniOrders)}
      
      Rules:
      1. If the farmer asks a question (like "how many orders today?"), answer it naturally based on stats/data.
      2. If the farmer says to ACCEPT or REJECT an order (like "accept the tomato order" or "reject the first order"), identify the exact order ID from the JSON.
      3. If they accept with a delivery time (like "accept apples, delivery in 2 days"), extract the time ("2 days").
      
      Output ONLY a valid JSON object with the following keys:
      {
        "response": "Short, friendly spoken response in the requested language",
        "action": "ACCEPT" | "REJECT" | null,
        "orderId": "the matched order id from the JSON, or null",
        "deliveryTime": "extracted delivery time string or null"
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
    return NextResponse.json(result);

  } catch (error) {
    console.error("Orders AI Error:", error);
    return NextResponse.json(
      { error: "Failed to process query", details: error.message },
      { status: 500 }
    );
  }
}
