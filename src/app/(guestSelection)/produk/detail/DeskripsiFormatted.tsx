function formatDeskripsi(teks: string): { label?: string; isi: string }[] {
  if (!teks?.trim()) return [];

  const labelPattern = /(?:^|\s)((?:[A-ZÀ-Ý][\wÀ-ÿ]*(?:\s&\s|\s)){0,3}[A-ZÀ-Ý][\wÀ-ÿ]*)\s*:\s+/g;

  const posisiLabel: { index: number; label: string; startIsi: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = labelPattern.exec(teks)) !== null) {
    posisiLabel.push({
      index: match.index,
      label: match[1].trim(),
      startIsi: match.index + match[0].length,
    });
  }

  if (posisiLabel.length === 0) {
    return [{ isi: teks.trim() }];
  }

  const hasil: { label?: string; isi: string }[] = [];

  const awal = teks.slice(0, posisiLabel[0].index).trim();
  if (awal) hasil.push({ isi: awal });

  posisiLabel.forEach((p, i) => {
    const akhir = i + 1 < posisiLabel.length ? posisiLabel[i + 1].index : teks.length;
    const isi = teks.slice(p.startIsi, akhir).trim();
    if (isi) hasil.push({ label: p.label, isi });
  });

  return hasil;
}

export default function DeskripsiFormatted({ teks }: { teks: string }) {
  const bagian = formatDeskripsi(teks);

  if (bagian.length === 0) {
    return <p className="text-sm text-gray-400">Belum ada deskripsi.</p>;
  }

  return (
    <div className="space-y-3">
      {bagian.map((b, i) => (
        <p key={i} className="text-sm leading-relaxed text-gray-500">
          {b.label && (
            <span className="font-semibold text-gray-700">{b.label}: </span>
          )}
          {b.isi}
        </p>
      ))}
    </div>
  );
}