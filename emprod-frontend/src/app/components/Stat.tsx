import { TrendingUp, TrendingDown } from 'lucide-react';
import { ReactNode } from 'react';
import { Card, CardContent } from './ui/card';

interface StatProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  icon?: ReactNode;
  iconClassName?: string;
}

export function Stat({ label, value, suffix, trend, icon, iconClassName }: StatProps) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-muted-foreground">{label}</p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">
            {value}
            {suffix && <span className="text-base font-normal ml-1 text-muted-foreground">{suffix}</span>}
          </p>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend).toFixed(1)}% vs yesterday</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-brand-light ${iconClassName || ''}`}>
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
