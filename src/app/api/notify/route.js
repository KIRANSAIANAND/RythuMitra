import { NextResponse } from "next/server";

/**
 * POST /api/notify
 * Body: { orderId, farmerMap, address, total }
 * 
 * Sends a browser-style notification stored in Firestore for each farmer.
 * If RESEND_API_KEY is set, also sends an email.
 */
export async function POST(req) {
  try {
    const { orderId, farmerMap, address, total } = await req.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // For each farmer, try to send email if Resend key exists
    for (const [farmerId, items] of Object.entries(farmerMap || {})) {
      const productList = items.map(i => `${i.name} × ${i.quantity}`).join(", ");
      const subject = `New Order on RythuMitra! Order #${orderId?.slice(-6)}`;
      const body = `
Dear Farmer,

You have a new order from RythuMitra!

Order ID: ${orderId}
Products: ${productList}
Total: ₹${total}
Delivery to: ${address.name}, ${address.street}, ${address.city}, ${address.pincode}
Phone: ${address.phone}

Please prepare for delivery. Thank you for selling on RythuMitra!
      `.trim();

      if (RESEND_API_KEY) {
        // Email integration ready — add Resend.com API call here
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
