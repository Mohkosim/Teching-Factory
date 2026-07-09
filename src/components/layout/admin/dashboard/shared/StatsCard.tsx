import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatItem } from "@/types/dashboard";

export function StatCard({
  title,
  value,
  description,
  icon,
  iconBg = "bg-primary/10",
}: StatItem) {
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
      </CardContent>
    </Card>
  );
}