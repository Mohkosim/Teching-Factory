import { describe, it, expect } from "vitest";
import { cekMagicBytes } from "./validate-file";

const f = (bytes: number[], type: string) => new File([new Uint8Array(bytes)], "x", { type });

describe("cekMagicBytes", () => {
    it("menerima PDF asli", async () => {
        expect(await cekMagicBytes(f([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], "application/pdf"), ["pdf"])).toBe(true);
    });
    it("menolak file berlabel PDF tetapi isinya bukan PDF", async () => {
        expect(await cekMagicBytes(f([0x4d, 0x5a, 0x90, 0x00], "application/pdf"), ["pdf"])).toBe(false);
    });
    it("menolak gambar bila yang diizinkan hanya PDF", async () => {
        expect(await cekMagicBytes(f([0xff, 0xd8, 0xff, 0xe0], "image/jpeg"), ["pdf"])).toBe(false);
    });
});
