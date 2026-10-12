import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: import("next").Viewport = {
  width: 1400,
  initialScale: undefined,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://homesketches.com"), // Replace with your production domain
  title: {
    default: "HomeSketches | Turn Rough Sketches into Photorealistic 3D Spaces",
    template: "%s | HomeSketches",
  },
  description:
    "Transform hand-drawn sketches, photos, and floor plans into high-resolution photorealistic interior renders, immersive 3D walkthroughs, and cinematic videos for agencies, designers, and real estate developers.",
  keywords: [
    "3D Interior Rendering",
    "Sketch to 3D Design",
    "Architectural Visualization",
    "Photorealistic Renders",
    "3D Walkthrough Videos",
    "Interior Visualisation Studio",
    "Floor Plan Rendering",
  ],
  authors: [{ name: "HomeSketches Dev Team" }],
  creator: "HomeSketches",
  publisher: "HomeSketches",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://homesketches.com",
    siteName: "HomeSketches",
    title: "HomeSketches | Turn Sketches & Ideas into Photorealistic Spaces",
    description:
      "High-resolution interior renders, interactive 3D walkthroughs, and cinematic visual content delivered in 24-48 hours.",
    images: [
      {
        url: "/og-image.png", // Place a 1200x630 banner in your /public folder
        width: 1200,
        height: 630,
        alt: "HomeSketches Interior Visualizations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeSketches | Turn Sketches into Photorealistic Spaces",
    description:
      "Transform sketches, photos, and floor plans into stunning interior renders and 3D walkthroughs.",
    images: ["/og-image.png"],
    creator: "@homesketches",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo1.png",
    apple: "/logo1.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
