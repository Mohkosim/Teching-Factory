import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function RingkasanRating({
  rating,
  jumlahReview,
  persentasePuas,
  breakdown,
}: {
  rating: number;
  jumlahReview: number;
  persentasePuas: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}) {
  return (
    <Card className="rounded-2xl border-gray-100">
      <CardContent className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[auto_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Star size={28} className="fill-yellow-400 text-yellow-400" />
            <span className="text-3xl font-bold text-gray-900">
              {rating.toFixed(1)}
              <span className="text-lg font-normal text-gray-400"> / 5.0</span>
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-700">
            {persentasePuas}% pembeli merasa puas
          </p>
          <p className="text-xs text-gray-400">
            {jumlahReview.toLocaleString("id-ID")} rating • {jumlahReview.toLocaleString("id-ID")} ulasan
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {([5, 4, 3, 2, 1] as const).map((bintang) => {
            const jumlah = breakdown[bintang] ?? 0;
            const persen = jumlahReview > 0 ? (jumlah / jumlahReview) * 100 : 0;
            return (
              <div key={bintang} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex w-6 shrink-0 items-center gap-0.5">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {bintang}
                </span>
                <Progress
                  value={persen}
                  className="h-1.5 flex-1 bg-gray-100 [&>div]:bg-sky-500"
                />
                <span className="w-8 shrink-0 text-right">({jumlah})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}