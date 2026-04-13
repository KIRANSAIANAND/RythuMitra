# 🌾 RythuMitra

An AI-powered farmer-to-consumer marketplace that enables farmers to sell products using voice interaction. The system uses Generative AI, NLP, and real-time analysis to assist farmers in listing products and help customers make informed decisions.

---

## 🎯 Features

### 👨‍🌾 Farmer Features
- **Voice-based product listing** (speech-to-text + AI processing)
- **Multilingual support** (auto-detect and respond in user language)
- **AI-generated product description**
- **AI-based product analysis** (price, demand, freshness)
- **Dynamic question-based product entry** (no fixed forms)
- **Automatic image fetching** (via Pexels API) or custom image upload
- **Farmer dashboard** to seamlessly manage products
- **Voice-based interaction** for hands-free and accessible usage

### 🛒 Customer Features
- **Browse and search** products
- **Add to cart** (secure, user-specific cart functionality)
- **Place order** (Cash on Delivery only)
- **My Orders** section with easy order tracking
- **Rating and feedback** system for all purchases
- **Automated quality control** (removes products with >30% dislikes)

### 📦 Order Management
- Farmer can **accept/reject** incoming orders
- Farmer can **set delivery time**
- **Live status updates** in the customer dashboard
- **Notifications** via email/messages

### 🤖 AI Capabilities
- **Natural Language Processing (NLP)** for conversational input
- **Voice recognition and dynamic response**
- **Market analysis** using intelligent API data
- Optional **image-based product scanning**
- **Smart recommendations** that support—without overriding—the farmer’s input

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion
- **Backend:** Firebase (Authentication + Firestore Database)
- **AI Integration:** LLMs (Groq API), Native NLP capabilities
- **Voice Features:** Speech-to-Text & Text-to-Speech APIs
- **Image Intelligence:** Pexels API
- **Deployment:** Vercel

---

## 🚀 Live Demo

[Live App URL](https://rythu-mitra-eoho.vercel.app/) *(Placeholder)*

---

## ⚙️ Setup Instructions

Follow these steps to run the application locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KIRANSAIANAND/RythuMitra.git
   cd rythu-mitra
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root of your project and include the following keys:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key_here"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain_here"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_firebase_project_id_here"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket_here"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_firebase_sender_id_here"
NEXT_PUBLIC_FIREBASE_APP_ID="your_firebase_app_id_here"

PEXELS_API_KEY="your_pexels_api_key_here"
GROQ_API_KEY="your_groq_api_key_here"
```

---

## 📊 Project Structure

```text
rythu-mitra/
├── src/
│   ├── app/           # Next.js App Router (pages and layouts)
│   ├── components/    # Reusable UI elements and sections
│   ├── context/       # Global state management and React contexts
│   └── lib/           # Utility functions, AI logic, API integrations, and Firebase setup
├── public/            # Static assets like images and icons
├── package.json       # Project dependencies and scripts
└── tailwind.config.js # Styling configurations
```

---

## 🌟 Future Enhancements

- **Real-time mandi price integration** for ultra-accurate pricing
- **Advanced AI quality detection** using direct image analysis
- **Online payment integration** (Stripe/Razorpay)
- **Logistics and delivery tracking**

---

## 🙌 Contribution

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
