import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "ATS AI Platform",
  description: "AI-powered Applicant Tracking System",
};

/** Root layout: fonts + global providers only (auth shell lives under (app)/). */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ margin: 0, minHeight: "100%" }} className={roboto.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
