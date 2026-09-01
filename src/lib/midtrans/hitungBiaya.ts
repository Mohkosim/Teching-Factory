// lib/midtrans/hitungBiaya.ts

function hitungBiayaMidtrans(paymentType: string, grossAmount: number): number {
  switch (paymentType) {
    case "bank_transfer":
    case "echannel":
      // Cocok dgn data Anda: Rp315.000 → Biaya -Rp4.440 (4000 * 1.11)
      return Math.round(4000 * 1.11);

    case "credit_card": {
      // MDR = 2.9% + Rp2.000, lalu kena PPN tambahan
      // TODO: belum tervalidasi dari data dashboard — cek transaksi -Rp38.410 di Channel
      const mdrCC = grossAmount * 0.029 + 2000;
      return Math.round(mdrCC * 1.11);
    }

    case "gopay":
    case "shopeepay":
      // PPN sudah termasuk di tarif
      // TODO: belum tervalidasi — cek transaksi -Rp6.660 di Channel, lalu sesuaikan rate-nya
      return Math.round(grossAmount * 0.02);

    case "qris":
      // Cocok dgn data Anda: Rp2.300.000 → Biaya -Rp16.100 (persis 0.7%, PPN sudah termasuk)
      return Math.round(grossAmount * 0.007);

    default:
      return 0;
  }
}

export { hitungBiayaMidtrans };