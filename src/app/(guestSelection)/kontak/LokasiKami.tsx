import { Card, CardContent } from "@/components/ui/card";

export default function LokasiKami() {
    return (
        <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
                <div className="text-center">
                    <h2 className="text-lg font-bold text-sky-600">Lokasi Kami</h2>
                    <p className="mt-1 text-xs text-gray-500">
                        Temukan lokasi sekolah kami melalui peta berikut
                    </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                    <iframe
                        src="https://www.google.com/maps?q=-7.900063,112.6068816&output=embed"
                        width="100%"
                        height="360"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full"
                        title="Lokasi Sekolah"
                    />
                </div>
            </CardContent>
        </Card>
    );
}