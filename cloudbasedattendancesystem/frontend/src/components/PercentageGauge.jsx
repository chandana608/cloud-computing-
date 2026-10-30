import React from 'react';
import { StatusBadge } from './StatusBadge';

export const PercentageGauge = ({
  percentage,
  category,
  attended = 0,
  eligible = 0,
  size = 'md',
  showDetails = true
}) => {
  const getColors = () => {
    if (percentage === null || percentage === undefined) {
      return { stroke: '#94a3b8', text: 'text-slate-500', bg: 'bg-slate-100' };
    }
    if (percentage >= 80) {
      return { stroke: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
    if (percentage >= 75) {
      return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' };
    }
    return { stroke: '#f43f5e', text: 'text-rose-600', bg: 'bg-rose-50' };
  };

  const colors = getColors();
  const radius = size === 'lg' ? 48 : 36;
  const strokeWidth = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const validPct = Math.min(100, Math.max(0, percentage || 0));
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative inline-flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={(radius + strokeWidth) * 2}
          height={(radius + strokeWidth) * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-lg'} ${colors.text}`}>
            {percentage !== null && percentage !== undefined ? `${percentage}%` : 'N/A'}
          </span>
          {category && (
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              {category}
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 text-center">
          <StatusBadge status={category || 'Unknown'} size="xs" />
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            {attended} attended / {eligible} eligible sessions
          </p>
        </div>
      )}
    </div>
  );
};
