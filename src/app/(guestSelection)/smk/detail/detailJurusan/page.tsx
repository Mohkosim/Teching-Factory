import type { Metadata } from "next";
import DetailJurusanClient from "./DetailJurusanClient";

export const metadata: Metadata = {
  title: "Detail Jurusan",
};

export default function Page() {
  return <DetailJurusanClient />;
}