import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";

export const metadata = {
  title: "RythuMitra - AI Farmer Marketplace",
  description: "Multilingual AI-powered marketplace connecting farmers and consumers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
