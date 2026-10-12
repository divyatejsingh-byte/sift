import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sift — Monday Morning Release Digest",
  description: "Sift the signal from the firehose: a 5-minute weekly digest of upstream releases, breaking changes and security patches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
