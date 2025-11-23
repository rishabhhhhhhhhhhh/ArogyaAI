import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  glow?: 'teal' | 'emerald' | 'cyan' | 'none';
}

export function MetricCard({ icon: Icon, label, value, change, trend = 'neutral', glow = 'none' }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <GlassCard glow={glow} hoverable>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-muted-foreground">{label}</p>
          <p className="text-3xl font-['Poppins'] font-semibold">{value}</p>
          {change && (
            <p className={`text-sm ${trendColor}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${glow === 'teal' ? 'bg-primary/10' : glow === 'emerald' ? 'bg-accent/10' : glow === 'cyan' ? 'bg-[#23C4F8]/10' : 'bg-muted'}`}>
          <Icon className={`w-6 h-6 ${glow === 'teal' ? 'text-primary' : glow === 'emerald' ? 'text-accent' : glow === 'cyan' ? 'text-[#23C4F8]' : 'text-muted-foreground'}`} />
        </div>
      </div>
    </GlassCard>
  );
}
