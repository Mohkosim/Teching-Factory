export default function LokasiMap({
  mapLink,
  alamat,
  kota,
  provinsi,
}: {
  mapLink?: string | null;
  alamat: string;
  kota: string;
  provinsi: string;
}) {
  const fallbackSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    `${alamat}, ${kota}, ${provinsi}`
  )}&output=embed`;
  const src = mapLink || fallbackSrc;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-center text-2xl font-bold text-gray-900">Lokasi Kami</h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Temukan lokasi sekolah kami melalui peta berikut
        </p>
        <div className="mt-6 overflow-hidden rounded-xl">
          <iframe
            src={src}
            width="100%"
            height="360"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Lokasi SMK"
          />
        </div>
      </div>
    </section>
  );
}