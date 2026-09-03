import IncomingContact from "./IncomingContact";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incoming Contact",
};

export default function KontakMasukPage() {
  return <IncomingContact />;
}