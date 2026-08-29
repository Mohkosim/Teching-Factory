import Swal from "sweetalert2";

/**
 * Konfirmasi generik (Ya/Batal) - dipakai untuk aksi yang butuh persetujuan user
 * sebelum dieksekusi (hapus, batalkan pesanan, keluar dari form, dll)
 */
export async function confirmAksi({
    title,
    text,
    icon = "warning",
    confirmText = "Ya, lanjutkan",
    cancelText = "Batal",
    confirmColor = "#3b82f6", // sky-500, default warna project
}: {
    title: string;
    text?: string;
    icon?: "warning" | "question" | "info" | "error";
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
}): Promise<boolean> {
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: confirmColor,
        cancelButtonColor: "#6b7280",
        reverseButtons: true,
    });
    return result.isConfirmed;
}

/** Shortcut khusus konfirmasi hapus (dipakai berkali-kali di banyak halaman) */
export function confirmHapus(namaItem: string) {
    return confirmAksi({
        title: "Hapus item ini?",
        text: `"${namaItem}" akan dihapus dan tidak bisa dikembalikan.`,
        icon: "warning",
        confirmText: "Ya, hapus",
        confirmColor: "#ef4444", // red-500
    });
}

/** Notifikasi sukses blocking (dipakai kalau butuh perhatian lebih dari toast) */
export function alertSukses(title: string, text?: string) {
    return Swal.fire({
        title,
        text,
        icon: "success",
        confirmButtonColor: "#3b82f6",
    });
}

/** Notifikasi gagal blocking */
export function alertGagal(title: string, text?: string) {
    return Swal.fire({
        title,
        text,
        icon: "error",
        confirmButtonColor: "#3b82f6",
    });
}

/** Loading modal (tampil sebelum request, tutup manual dengan Swal.close()) */
export function tampilkanLoading(title = "Memproses...") {
    Swal.fire({
        title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        },
    });
}