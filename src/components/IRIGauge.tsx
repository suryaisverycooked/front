interface IRIGaugeProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getIRIColor(value: number): string {
  if (value >= 80) return '#ef4444'; // red
  if (value >= 60) return '#f97316'; // orange
  if (value >= 40) return '#eab308'; // yellow
  return '#10b981'; // emerald
}

function getIRILabel(value: number): string {
  if (value >= 80) return 'CRITICAL';
  if (value >= 60) return 'HIGH RISK';
  if (value >= 40) return 'MODERATE';
  if (value >= 20) return 'LOW RISK';
  return 'MINIMAL';
}

export default function IRIGauge({ value, size = 'md', showLabel = true }: IRIGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const color = getIRIColor(clampedValue);
  const label = getIRILabel(clampedValue);

  const sizeConfig = {
    sm: { r: 32, strokeWidth: 6, fontSize: 14, labelSize: 9, cx: 40, cy: 40, viewBox: '0 0 80 80' },
    md: { r: 44, strokeWidth: 8, fontSize: 20, labelSize: 10, cx: 56, cy: 56, viewBox: '0 0 112 112' },
    lg: { r: 60, strokeWidth: 10, fontSize: 26, labelSize: 12, cx: 76, cy: 76, viewBox: '0 0 152 152' },
  };

  const cfg = sizeConfig[size];
  const circumference = 2 * Math.PI * cfg.r;
  // Only show 75% of the circle (270 degrees)
  const arcLength = circumference * 0.75;
  const filled = arcLength * (clampedValue / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg
          viewBox={cfg.viewBox}
          className={size === 'sm' ? 'w-20 h-20' : size === 'md' ? 'w-28 h-28' : 'w-40 h-40'}
          style={{ transform: 'rotate(135deg)' }}
        >
          {/* Background track */}
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke="#1f2937"
            strokeWidth={cfg.strokeWidth}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.strokeWidth}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: 'stroke-dasharray 0.8s ease',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'translateY(4px)' }}>
          <span
            className="font-black leading-none tabular-nums"
            style={{ color, fontSize: cfg.fontSize }}
          >
            {clampedValue}
          </span>
          <span className="text-gray-500 leading-none" style={{ fontSize: cfg.labelSize }}>
            /100
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <span
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color }}
          >
            {label}
          </span>
          <p className="text-gray-500 text-xs mt-0.5">Risk Index</p>
        </div>
      )}
    </div>
  );
}
