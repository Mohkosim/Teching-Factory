import type { Metadata } from "next";
import RegisterSmkForm from "./register-smk-form";

export const metadata: Metadata = {
  title: "Daftar sebagai SMK",
};

export default function RegisterSmkPage() {
  return <RegisterSmkForm />;
}
