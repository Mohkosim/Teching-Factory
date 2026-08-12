"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export default function SMKHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    router.push(`/smk?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden bg-linear-to-b from-sky-500 to-sky-600 py-20 px-4">
      {/* subtle background pattern, ganti dengan foto gedung sekolah kalau ada asset */}
      <div className="absolute inset-0 bg-[url('/images/school-bg.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay" />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Portal Jurusan pada
          <br />
          masing-masing SMK
        </h1>

        <form onSubmit={handleSearch} className="mt-8">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama SMK..."
              className="w-full rounded-full border-0 bg-white/95 py-3 pl-12 pr-4 text-sm text-gray-700 shadow-lg outline-none ring-0 focus:bg-white transition-colors"
            />
          </div>
        </form>
      </div>
    </section>
  );
}