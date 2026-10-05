import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

import PengajuanMitraClient from "@/app/(guestSelection)/profile/pengajuan-mitra/pengajuan-mitra-client";

const dataLama = {
  namaSekolah: "SMK Negeri 3 Pamekasan",
  npsn: "20522637",
  namaPenanggungJawab: "Pak Budi",
  noHpPenanggungJawab: "081906906536",
};

const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("Halaman Status Pengajuan Mitra", () => {
  it("status Ditolak: menampilkan alasan penolakan dan form terisi data lama", () => {
    render(
      <PengajuanMitraClient
        status="Ditolak"
        catatanAdmin="NPSN tidak sesuai"
        diprosesAt="2026-10-05T03:00:00.000Z"
        initialData={dataLama}
      />
    );

    expect(screen.getByText(/Pengajuan ditolak/)).toBeInTheDocument();
    expect(screen.getByText("NPSN tidak sesuai")).toBeInTheDocument();
    expect(screen.getByLabelText("Nama Sekolah")).toHaveValue(dataLama.namaSekolah);
    expect(screen.getByLabelText("NPSN")).toHaveValue(dataLama.npsn);
    expect(screen.getByLabelText("Nama Penanggung Jawab")).toHaveValue(dataLama.namaPenanggungJawab);
    expect(screen.getByLabelText("No. HP Penanggung Jawab")).toHaveValue(dataLama.noHpPenanggungJawab);
    expect(screen.getByRole("button", { name: "Ajukan Ulang" })).toBeInTheDocument();
  });

  it("status Ditolak tanpa catatan: menampilkan teks pengganti", () => {
    render(<PengajuanMitraClient status="Ditolak" catatanAdmin={null} diprosesAt={null} initialData={dataLama} />);
    expect(screen.getByText("Tidak ada catatan dari admin.")).toBeInTheDocument();
  });

  it("status Menunggu: hanya menampilkan info proses, tanpa form", () => {
    render(<PengajuanMitraClient status="Menunggu" catatanAdmin={null} diprosesAt={null} initialData={dataLama} />);
    expect(screen.getByText("Menunggu persetujuan SuperAdmin")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajukan Ulang" })).not.toBeInTheDocument();
  });

  it("status Disetujui: menampilkan pesan agar login ulang", () => {
    render(<PengajuanMitraClient status="Disetujui" catatanAdmin={null} diprosesAt={null} initialData={dataLama} />);
    expect(screen.getByText(/login ulang/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajukan Ulang" })).not.toBeInTheDocument();
  });

  it("ajukan ulang dengan data valid: memanggil API, menampilkan toast sukses, dan memuat ulang halaman", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: "Pengajuan berhasil dikirim" }) });
    const user = userEvent.setup();
    render(<PengajuanMitraClient status="Ditolak" catatanAdmin="x" diprosesAt={null} initialData={dataLama} />);

    const npsn = screen.getByLabelText("NPSN");
    await user.clear(npsn);
    await user.type(npsn, "12345678");
    await user.click(screen.getByRole("button", { name: "Ajukan Ulang" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/pengajuan-mitra");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ ...dataLama, npsn: "12345678" });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it("ajukan ulang dengan NPSN tidak valid: menampilkan pesan error dan tidak memanggil API", async () => {
    const user = userEvent.setup();
    render(<PengajuanMitraClient status="Ditolak" catatanAdmin="x" diprosesAt={null} initialData={dataLama} />);

    const npsn = screen.getByLabelText("NPSN");
    await user.clear(npsn);
    await user.type(npsn, "123");
    await user.click(screen.getByRole("button", { name: "Ajukan Ulang" }));

    expect(await screen.findByText("NPSN harus 8 digit")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API menolak pengajuan: menampilkan toast error dan tidak memuat ulang halaman", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: "NPSN ini sudah terdaftar sebagai mitra SMK" }) });
    const user = userEvent.setup();
    render(<PengajuanMitraClient status="Ditolak" catatanAdmin="x" diprosesAt={null} initialData={dataLama} />);

    await user.click(screen.getByRole("button", { name: "Ajukan Ulang" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("NPSN ini sudah terdaftar sebagai mitra SMK"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
