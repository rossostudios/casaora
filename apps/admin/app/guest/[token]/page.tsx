import type { Metadata } from "next";

import { GuestDashboard } from "./guest-dashboard";

export const metadata: Metadata = {
  title: "Guest Portal | Casaora",
  robots: { index: false, follow: false },
};

export default function GuestTokenPage() {
  return <GuestDashboard />;
}
