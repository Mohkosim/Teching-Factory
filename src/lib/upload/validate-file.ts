export type FileKind = "jpeg" | "png" | "webp" | "pdf" | "mp4" | "webm" | "mov";

function startsWith(buf: Uint8Array, sig: number[], offset = 0) {
    return sig.every((b, i) => buf[offset + i] === b);
}

function deteksi(buf: Uint8Array): FileKind | null {
    if (startsWith(buf, [0xff, 0xd8, 0xff])) return "jpeg";
    if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
    if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
    if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
    if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
        return startsWith(buf, [0x71, 0x74, 0x20, 0x20], 8) ? "mov" : "mp4";
    }
    if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
    return null;
}

export async function cekMagicBytes(file: File, diizinkan: FileKind[]): Promise<boolean> {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const kind = deteksi(head);
    return kind !== null && diizinkan.includes(kind);
}
