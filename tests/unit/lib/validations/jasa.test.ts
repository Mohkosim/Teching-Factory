import { describe, it, expect } from "vitest";
import { jasaSchema } from "@/lib/validations/jasa";

const dataValid = {
  nama_jasa: "Servis AC Rumah",
  deskripsi: "Servis AC oleh siswa jurusan Teknik Elektro",
  harga: 150000,
  status: "Tersedia" as const,
  estimasi_pengerjaan: "1-2 hari",
  total_project: 5,
  fotos: ["https://res.cloudinary.com/foto-jasa1.jpg"],
};

describe("jasaSchema", () => {
  it("menerima data jasa yang lengkap dan valid", () => {
    expect(jasaSchema.safeParse(dataValid).success).toBe(true);
  });

  it("menolak jika nama_jasa kosong", () => {
    const result = jasaSchema.safeParse({ ...dataValid, nama_jasa: "" });
    expect(result.success).toBe(false);
  });

  it("menolak harga negatif", () => {
    const result = jasaSchema.safeParse({ ...dataValid, harga: -1000 });
    expect(result.success).toBe(false);
  });

  it("menolak jika tidak ada foto sama sekali", () => {
    const result = jasaSchema.safeParse({ ...dataValid, fotos: [] });
    expect(result.success).toBe(false);
  });

  it("menolak status di luar enum yang diperbolehkan", () => {
    const result = jasaSchema.safeParse({ ...dataValid, status: "Draft" });
    expect(result.success).toBe(false);
  });

  it("mengizinkan deskripsi tidak diisi (opsional)", () => {
    const { deskripsi: _deskripsi, ...tanpaDeskripsi } = dataValid;
    expect(jasaSchema.safeParse(tanpaDeskripsi).success).toBe(true);
  });

  it("mengizinkan estimasi_pengerjaan tidak diisi (opsional)", () => {
    const { estimasi_pengerjaan: _estimasi_pengerjaan, ...tanpaEstimasi } = dataValid;
    expect(jasaSchema.safeParse(tanpaEstimasi).success).toBe(true);
  });

  it("meng-coerce harga dan total_project bertipe string menjadi number", () => {
    const result = jasaSchema.safeParse({
      ...dataValid,
      harga: "150000",
      total_project: "5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.harga).toBe(150000);
      expect(result.data.total_project).toBe(5);
    }
  });

  it("total_project default ke 0 jika tidak diisi", () => {
    const { total_project: _total_project, ...tanpaTotalProject } = dataValid;
    const result = jasaSchema.safeParse(tanpaTotalProject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total_project).toBe(0);
    }
  });

  it("menolak total_project negatif", () => {
    const result = jasaSchema.safeParse({ ...dataValid, total_project: -1 });
    expect(result.success).toBe(false);
  });

  it("mengizinkan status_publikasi tidak diisi (opsional)", () => {
    expect(jasaSchema.safeParse(dataValid).success).toBe(true);
  });

  it("menolak status_publikasi di luar enum yang diperbolehkan", () => {
    const result = jasaSchema.safeParse({ ...dataValid, status_publikasi: "Ditolak" });
    expect(result.success).toBe(false);
  });

  it("menerima status_publikasi yang valid", () => {
    const result = jasaSchema.safeParse({ ...dataValid, status_publikasi: "Published" });
    expect(result.success).toBe(true);
  });

  it("mengizinkan portofolio tidak diisi (opsional)", () => {
    expect(jasaSchema.safeParse(dataValid).success).toBe(true);
  });

  it("menerima portofolio dengan deskripsi null", () => {
    const result = jasaSchema.safeParse({
      ...dataValid,
      portofolio: [{ file_path: "https://res.cloudinary.com/portof1.jpg", deskripsi: null }],
    });
    expect(result.success).toBe(true);
  });

  it("menerima portofolio dengan beberapa item sekaligus", () => {
    const result = jasaSchema.safeParse({
      ...dataValid,
      portofolio: [
        { file_path: "https://res.cloudinary.com/portof1.jpg", deskripsi: "Sebelum" },
        { file_path: "https://res.cloudinary.com/portof2.jpg", deskripsi: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("menolak item portofolio yang tidak punya file_path", () => {
    const result = jasaSchema.safeParse({
      ...dataValid,
      portofolio: [{ deskripsi: "Tanpa file" }],
    });
    expect(result.success).toBe(false);
  });
});