import type { SeverityLevel } from '../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
}

const severityConfig: Record<SeverityLevel, { bg: string; text: string; dot: string; label: string }> = {
  Low: {
    bg: 'bg-emerald-500/15 border border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    label: 'Low Risk',
  },
  Moderate: {
    bg: 'bg-yellow-500/15 border border-yellow-500/30',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    label: 'Moderate',
  },
  High: {
    bg: 'bg-orange-500/15 border border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    label: 'High Risk',
  },
  Critical: {
    bg: 'bg-red-500/15 border border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'CRITICAL',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${severity === 'Critical' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
