import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import { PushkaraluKalash } from '../../components/common/BrandEmblems';

interface ReadinessGaugeProps {
  score?: number;
  onTrackCount?: number;
  atRiskCount?: number;
  overdueCount?: number;
}

export const ReadinessGaugeWidget: React.FC<ReadinessGaugeProps> = ({
  score = 72,
  onTrackCount = 5,
  atRiskCount = 2,
  overdueCount = 1,
}) => {
  const navigate = useNavigate();

  // SVG arc calculation for semi-circle gauge (180 degrees)
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // 180 deg arc length
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-[#E9DED2] shadow-card overflow-hidden flex flex-col justify-between h-full p-4 sm:p-5">
      {/* Widget Header */}
      <div className="flex items-center gap-2 border-b border-[#E9DED2]/70 pb-3">
        <PushkaraluKalash className="w-5 h-5 shrink-0" />
        <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">
          Project Readiness (Overall)
        </h3>
      </div>

      {/* Semi-Circular SVG Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg viewBox="0 0 200 120" className="w-48 h-28 overflow-visible">
          <defs>
            <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E87512" />
              <stop offset="70%" stopColor="#F4B942" />
              <stop offset="100%" stopColor="#15803D" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="#F0E5D8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <path
            d="M 20 110 A 80 80 0 0 1 180 110"
            fill="none"
            stroke="url(#readinessGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Display Number */}
        <div className="text-center -mt-10">
          <span className="text-3xl sm:text-4xl font-extrabold text-[#35251E] tracking-tight block leading-none font-serif">
            {score}%
          </span>
          <span className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider block mt-1">
            Readiness Score
          </span>
        </div>
      </div>

      {/* 3 Metric Status Columns */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E9DED2] text-center my-2">
        {/* On Track */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[#15803D] mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">On Track</span>
          </div>
          <span className="text-xs font-bold text-textPrimary">{onTrackCount} Projects</span>
        </div>

        {/* At Risk */}
        <div className="flex flex-col items-center border-x border-[#E9DED2]">
          <div className="flex items-center gap-1 text-[#B45309] mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">At Risk</span>
          </div>
          <span className="text-xs font-bold text-textPrimary">{atRiskCount} Projects</span>
        </div>

        {/* Overdue */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[#B91C1C] mb-0.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
          </div>
          <span className="text-xs font-bold text-textPrimary">{overdueCount} Project</span>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <button
        onClick={() => navigate('/readiness')}
        className="w-full mt-2 py-2 px-3 rounded-xl bg-[#FEF3E8] hover:bg-[#FCE4CB] border border-[#FCE4CB] text-[#8F2D16] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
      >
        <span>View Readiness Analysis</span>
        <ArrowRight className="w-3.5 h-3.5 text-[#8F2D16]" />
      </button>
    </div>
  );
};

