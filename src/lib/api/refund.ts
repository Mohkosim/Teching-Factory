export async function ajukanRefund(formData: FormData): Promise<{ refund_id: string }> {
    const res = await fetch("/api/refund", {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Gagal mengajukan refund");
    }
    return res.json();
}