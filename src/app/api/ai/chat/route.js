import { NextResponse } from "next/server";

/**
 * POST /api/ai/chat
 * Body: { history: [{role, content}], language: "en"|"hi"|"te" }
 * Returns: { nextQuestion, isComplete, summary }
 *
 * The AI decides dynamically what to ask next based on conversation context.
 * When it has enough info, it sets isComplete=true and provides a summary object.
 */
export async function POST(req) {
  try {
    const { history = [], language = "en" } = await req.json();

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      // Mock fallback
      const mockQuestions = {
        en: [
          "What product do you want to sell?",
          "How much quantity do you have? (e.g. 50 kg)",
          "When was it harvested? Was it today or a few days ago?",
          "How would you describe the quality? (e.g. fresh, premium, organic)"
        ],
        hi: [
          "आप कौन सा उत्पाद बेचना चाहते हैं?",
          "आपके पास कितनी मात्रा है? (जैसे 50 किलो)",
          "इसकी कटाई कब हुई थी?",
          "गुणवत्ता कैसी है?"
        ],
        te: [
          "మీరు ఏ ఉత్పత్తిని విక్రయించాలనుకుంటున్నారు?",
          "మీకు ఎంత పరిమాణం ఉంది? (ఉదా. 50 కిలోలు)",
          "ఇది ఎప్పుడు పండించబడింది?",
          "నాణ్యత ఎలా ఉంది?"
        ]
      };

      const questionIndex = Math.floor(history.filter(h => h.role === "assistant").length);
      const isComplete = questionIndex >= 4;

      if (isComplete) {
        return NextResponse.json({
          nextQuestion: null,
          isComplete: true,
          summary: history.filter(h => h.role === "user").map(h => h.content).join(". ")
        });
      }

      return NextResponse.json({
        nextQuestion: (mockQuestions[language] || mockQuestions.en)[questionIndex] || mockQuestions.en[questionIndex],
        isComplete: false,
        summary: null
      });
    }

    const langName = language === "hi" ? "Hindi" : language === "te" ? "Telugu" : "English";

    const systemPrompt = `You are a friendly, highly intelligent AI assistant for RythuMitra, an agricultural marketplace in India.
You are helping a farmer list their produce. 

YOUR GOAL is to have a natural conversation to gather EXACTLY these details:
1. Product Name (What are they selling?)
2. Product Type/Variant (e.g., if Tomatoes -> Hybrid or Local? if Apple -> Shimla or Kashmir? if Milk -> Cow or Buffalo?)
3. Quantity with EXACT reasonable units (e.g., Milk -> Liters, Eggs -> Pieces, Leafy Greens -> Bundles, Vegetables/Fruits -> Kg).
4. Expected Price per unit (Optional, but try asking once. "What price are you expecting per Kg?")
5. Harvest Date or Quality (When was it harvested or how fresh is it?)

RULES FOR CONVERSATION:
- Ask exactly ONE question at a time.
- Start by asking what they want to sell. 
- If they tell you the product but not the variant, ASK for the variant! (e.g. "Do you have Cow milk or Buffalo milk?")
- If they give the product, ASK for the quantity and SUGGEST the unit. (e.g. "How many liters of milk do you have?" or "How many pieces of eggs?")
- Keep your questions SHORT, natural, and friendly (max 15-20 words).
- You MUST speak in ${langName} (language code: ${language}).

WHEN TO FINISH:
ONLY when you successfully have collected the Name, Variant, Quantity with correct unit, and Harvest/Quality info, you may end the interaction. 
If they haven't provided all these details, keep asking! Never stop early.

OUTPUT CRITERIA - RESPOND EXCLUSIVELY IN THIS JSON FORMAT:
If you still need information:
{"isComplete": false, "nextQuestion": "your next question in ${langName}"}

If you have ALL the information and are ready to finalize:
{"isComplete": true, "summary": "Detailed English summary of all facts collected: product name, variant/type, precise quantity with units, price if given, and quality details."}
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const result = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({
      nextQuestion: result.nextQuestion || null,
      isComplete: result.isComplete || false,
      summary: result.summary || null
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      { error: "AI chat failed", details: error.message },
      { status: 500 }
    );
  }
}
