"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  pengajuanMitraSchema,
  type PengajuanMitraSchema,
} from "@/lib/validations/pengajuan-mitra";

interface Props {
  status: "Menunggu" | "Disetujui" | "Ditolak";
  catatanAdmin: string | null;
  diprosesAt: string | null;
  initialData: PengajuanMitraSchema;
}

const FIELDS: {
  name: keyof PengajuanMitraSchema;
  label: string;
  placeholder: string;
  inputMode?: "numeric" | "tel";
  maxLength?: number;
}[] = [
  { name: "namaSekolah", label: "Nama Sekolah", placeholder: "SMK Negeri 1 ..." },
  { name: "npsn", label: "NPSN", placeholder: "8 digit angka", inputMode: "numeric", maxLength: 8 },
  { name: "namaPenanggungJawab", label: "Nama Penanggung Jawab", placeholder: "Nama lengkap" },
  { name: "noHpPenanggungJawab", label: "No. HP Penanggung Jawab", placeholder: "081234567890", inputMode: "tel", maxLength: 13 },
];

function formatTanggal(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PengajuanMitraClient({
  status,
  catatanAdmin,
  diprosesAt,
  initialData,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PengajuanMitraSchema>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof PengajuanMitraSchema, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (name: keyof PengajuanMitraSchema, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async () => {
    const parsed = pengajuanMitraSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof PengajuanMitraSchema, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PengajuanMitraSchema;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pengajuan-mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Gagal mengirim pengajuan");
        return;
      }
      toast.success(json.message ?? "Pengajuan berhasil dikirim ulang");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan, coba lagi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-sky-100 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Status Pengajuan Mitra</h1>

      {status === "Menunggu" && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Menunggu persetujuan SuperAdmin</p>
            <p className="text-sm text-amber-700">
              Pengajuan untuk <b>{initialData.namaSekolah}</b> sedang diproses. Hasilnya akan
              dikirim ke e-mail Anda.
            </p>
          </div>
        </div>
      )}

      {status === "Disetujui" && (
        <div className="flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
          <p className="text-sm text-green-800">
            Pengajuan disetujui. Silakan login ulang untuk masuk sebagai Admin SMK.
          </p>
        </div>
      )}

      {status === "Ditolak" && (
        <>
          <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">
                Pengajuan ditolak{diprosesAt ? ` pada ${formatTanggal(diprosesAt)}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-red-700">
                {catatanAdmin?.trim() || "Tidak ada catatan dari admin."}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Perbaiki data di bawah ini, lalu ajukan ulang. Tidak perlu mendaftar atau OTP lagi.
          </p>

          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  value={form[f.name]}
                  placeholder={f.placeholder}
                  inputMode={f.inputMode}
                  maxLength={f.maxLength}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  aria-invalid={!!errors[f.name]}
                />
                {errors[f.name] && (
                  <p className="text-xs text-red-600">{errors[f.name]}</p>
                )}
              </div>
            ))}

            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? "Mengirim..." : "Ajukan Ulang"}
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
