// Dijalankan otomatis sekali oleh Next.js saat server (proses Node) mulai hidup.
// Dipakai untuk menjadwalkan job pembersihan akun yang belum verifikasi,
// supaya di deployment Docker tidak perlu setup cron job terpisah di luar aplikasi.

const CLEANUP_INTERVAL_MS =
  (Number(process.env.CLEANUP_INTERVAL_MINUTES) > 0
    ? Number(process.env.CLEANUP_INTERVAL_MINUTES)
    : 60) *
  60 *
  1000; // default: tiap 60 menit

export async function register() {

  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  console.log(
    `[cleanup-unverified] scheduler aktif, jalan tiap ${CLEANUP_INTERVAL_MS / 60000} menit`
  );

  const { runCleanupUnverified } = await import("@/lib/jobs/cleanup-unverified");

  const tick = async () => {
    try {
      const { deletedCount } = await runCleanupUnverified();
      console.log(`[cleanup-unverified] cek dijalankan, ${deletedCount} akun dihapus`);
    } catch (error) {
      console.error("[cleanup-unverified] gagal menjalankan job:", error);
    }
  };

  // Jalankan sekali saat startup, lalu ulangi tiap interval.
  void tick();
  setInterval(tick, CLEANUP_INTERVAL_MS);
}