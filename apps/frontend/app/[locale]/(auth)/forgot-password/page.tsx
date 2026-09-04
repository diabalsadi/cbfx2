import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = { title: "CBFX — Forgot Password" };

export default function Page() {
  return <ForgotPasswordClient />;
}
