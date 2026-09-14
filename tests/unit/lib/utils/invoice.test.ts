import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateKodeInvoice,
  encodeCicilanOrderId,
  decodeCicilanOrderId,
} from "@/lib/utils/invoice";

describe("generateKodeInvoice", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("menghasilkan format INV-YYYYMMDD-XXXXXX", () => {
    const kode = generateKodeInvoice();
    expect(kode).toMatch(/^INV-\d{8}-[A-Z0-9]{6}$/);
  });

  it("menyematkan tanggal hari ini ke dalam kode invoice", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T10:00:00.000Z"));

    const kode = generateKodeInvoice();
    expect(kode.startsWith("INV-20260906-")).toBe(true);
  });

  it("menghasilkan kode yang berbeda pada tiap pemanggilan (bagian random)", () => {
    const a = generateKodeInvoice();
    const b = generateKodeInvoice();
    // Secara teori bisa collide, tapi dengan 36^6 kombinasi peluangnya sangat kecil
    expect(a).not.toBe(b);
  });
});

describe("encodeCicilanOrderId / decodeCicilanOrderId", () => {
  it("encode menghasilkan prefix CICIL- dan menghapus tanda strip dari orderId", () => {
    const orderId = "3f7b1c2d-4e5f-6789-abcd-1234567890ef";
    const encoded = encodeCicilanOrderId(orderId);

    expect(encoded.startsWith("CICIL-")).toBe(true);
    expect(encoded).not.toContain(orderId); // strip sudah dihapus, jadi tidak match persis
  });

  it("decode dapat mengembalikan orderId UUID asli dari hasil encode (roundtrip)", () => {
    const orderId = "3f7b1c2d-4e5f-6789-abcd-1234567890ef";
    const encoded = encodeCicilanOrderId(orderId);
    const decoded = decodeCicilanOrderId(encoded);

    expect(decoded).toBe(orderId);
  });

  it("roundtrip tetap konsisten untuk beberapa UUID acak", () => {
    const uuids = [
      "00000000-0000-4000-8000-000000000000",
      "ffffffff-ffff-4fff-bfff-ffffffffffff",
      "a1b2c3d4-e5f6-4789-9abc-def012345678",
    ];

    for (const orderId of uuids) {
      const encoded = encodeCicilanOrderId(orderId);
      expect(decodeCicilanOrderId(encoded)).toBe(orderId);
    }
  });

  it("format hasil decode mengikuti pola UUID (8-4-4-4-12)", () => {
    const encoded = encodeCicilanOrderId("11111111-2222-3333-4444-555555555555");
    const decoded = decodeCicilanOrderId(encoded);

    expect(decoded).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
