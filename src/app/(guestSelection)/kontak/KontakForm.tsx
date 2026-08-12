"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MessageSquare, Loader2 } from "lucide-react";
import { kirimPesanKontak } from "@/lib/api/kontak";

const initialForm = {
  nama: "",
  email: "",
  phone: "",
  pesan: "",
};

export default function KontakForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      await kirimPesanKontak(form);
      toast.success("Pesan berhasil dikirim!", {
        description: "Terima kasih, pesan anda telah dikirim.",
      });
      setForm(initialForm);
    } catch (error) {
      toast.error("Gagal mengirim pesan", {
        description:
          error instanceof Error ? error.message : "Silakan coba lagi",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="grid gap-8 p-6 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-lg font-bold text-sky-600">Kontak</h2>
          <p className="mt-1 text-xs text-gray-500">
            Silakan isi formulir kontak di bawah ini
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={form.nama}
                onChange={(e) => handleChange("nama", e.target.value)}
                placeholder="Masukkan Nama"
                className="bg-sky-50 pl-9 border-0"
                required
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Masukkan E-mail"
                className="bg-sky-50 pl-9 border-0"
                required
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="Masukkan Nomor Hp"
                className="bg-sky-50 pl-9 border-0"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                value={form.pesan}
                onChange={(e) => handleChange("pesan", e.target.value)}
                placeholder="Masukkan Pesan"
                className="min-h-40 resize-none bg-sky-50 pl-9 pt-3 border-0"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-sky-600 hover:bg-sky-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Pesan"
              )}
            </Button>
          </form>
        </div>

        <div className="relative mx-auto h-52 w-52 overflow-hidden rounded-full md:h-60 md:w-60">
          <Image
            src="/img/high_five.png"
            alt="Partnership"
            fill
            className="object-cover"
          />
        </div>
      </CardContent>
    </Card>
  );
}