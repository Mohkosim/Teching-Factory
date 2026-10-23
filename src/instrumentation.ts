const CLEANUP_INTERVAL_MS =
  (Number(process.env.CLEANUP_INTERVAL_MINUTES) > 0
    ? Number(process.env.CLEANUP_INTERVAL_MINUTES)
    : 60) *
  60 *
  1000;

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

  try {
    const { pecahOrderCampuranLama } = await import("@/lib/jobs/pecah-order-lama");
    const { dipecah } = await pecahOrderCampuranLama();
    if (dipecah > 0) console.log(`[pecah-order-lama] ${dipecah} order campuran dipecah per jurusan`);
  } catch (error) {
    console.error("[pecah-order-lama] gagal:", error);
  }

  void tick();
  setInterval(tick, CLEANUP_INTERVAL_MS);
}