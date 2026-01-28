import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eau Sure Dashboard",
  description: "Water management dashboard with authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
