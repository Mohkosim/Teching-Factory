import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg?: string;
}

export function StatsCard({
  title,
  value,
  description,
  href,
  icon,
  iconBg = "bg-primary/10",
}: StatsCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-foreground font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center",
              iconBg
            )}
          >
            {icon}
          </div>
        </div>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 font-medium hover:underline"
        >
          Lihat Selengkapnya
          <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}