import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "CBFX — Sign in" };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <Link
        href="/"
        style={{
          position: "fixed",
          top: "20px",
          left: "24px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: 500,
          color: "#999",
          textDecoration: "none",
        }}
      >
        ← Back to home
      </Link>
      {children}
    </div>
  );
}
