"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowRight } from "lucide-react";
import { useState } from "react";
import { getYoutubeId } from "@/lib/youtube";

interface VideoProfilSectionProps {
  videoLink: string | null;
}

export default function VideoProfilSection({ videoLink }: VideoProfilSectionProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const videoId = videoLink ? getYoutubeId(videoLink) : null;

  if (!videoId) {
    return null;
  }

  return (
    <section className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="relative aspect-video overflow-hidden rounded-2xl shadow-md">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
              title="Video Profil TEFA"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="group relative h-full w-full"
            >
              <Image
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt="Video Profil TEFA"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-lg transition-transform group-hover:scale-105">
                <Play className="h-6 w-6 fill-current" />
              </span>
            </button>
          )}
        </div>

        <div>
          <Badge className="mb-3 bg-blue-100 text-sky-600 hover:bg-blue-100">
            Video Profil
          </Badge>
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Ayo Lihat Video Profil Kami
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Kenali lebih dekat bagaimana Teaching Factory berjalan di
            berbagai SMK, mulai dari proses belajar, produksi, hingga karya
            siswa yang telah dinikmati masyarakat luas.
          </p>

          <Link
            href="/tentang/video"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:underline"
          >
            Selengkapnya
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}