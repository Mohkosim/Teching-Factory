import { describe, it, expect } from "vitest";
import { mapKodeKurir } from "@/lib/utils/kurir-map";

describe("mapKodeKurir", () => {
  it("memetakan nama kurir yang dikenal ke kode RajaOngkir yang benar", () => {
    expect(mapKodeKurir("JNE")).toBe("jne");
    expect(mapKodeKurir("J&T")).toBe("jnt");
    expect(mapKodeKurir("SiCepat")).toBe("sicepat");
  });

  it("fallback ke lowercase apa adanya untuk kurir yang tidak ada di map", () => {
    expect(mapKodeKurir("AnterAja")).toBe("anteraja");
    expect(mapKodeKurir("POS")).toBe("pos");
  });

  it("pencarian di map bersifat case-sensitive terhadap key ('jne' tidak match 'JNE')", () => {
    // Karena key map adalah "JNE" (persis), input lowercase tidak ditemukan
    // dan jatuh ke fallback toLowerCase() -> hasil akhirnya sama saja "jne"
    expect(mapKodeKurir("jne")).toBe("jne");
  });
});
