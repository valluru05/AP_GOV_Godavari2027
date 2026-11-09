import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowRight,
  AlertOctagon,
  Info
} from 'lucide-react';
import type { ActionQueueItem } from '../../types/dashboard';

interface ActionQueueWidgetProps {
  items: ActionQueueItem[];
}

export const ActionQueueWidget: React.FC<ActionQueueWidgetProps> = ({ items }) => {
  const navigate = useNavigate();

  // If items from backend are empty or loading, show representative prioritized action items
  const displayItems =
    items && items.length > 0
      ? items.slice(0, 4)
      : [
          {
            id: 'act-1',
            title: 'Sanitation Block - Main Ghat',
            description: 'Inspection failed • Rework required',
            severity: 'Critical',
            suggested_action: 'Direct vendor rework',
            link_url: '/defects',
          },
          {
            id: 'act-2',
            title: 'Water Kiosk - Zone 3',
            description: 'Milestone overdue by 3 days',
            severity: 'High',
            suggested_action: 'Expedite plumbing assembly',
            link_url: '/projects',
          },
          {
            id: 'act-3',
            title: 'Temporary Lighting - Zone 2',
            description: 'Evidence pending verification',
            severity: 'Medium',
            suggested_action: 'Dispatch field inspector',
            link_url: '/inspections',
          },
          {
            id: 'act-4',
            title: 'Drinking Water Unit - Zone 4',
            description: 'Inspection due tomorrow',
            severity: 'Low',
            suggested_action: 'Confirm inspector availability',
            link_url: '/inspections',
          },
        ];

  const getItemIcon = (severity: string, index: number) => {
    if (severity === 'Critical' || index === 0) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center shrink-0">
          <AlertOctagon className="w-4 h-4 text-[#B91C1C]" />
        </div>
      );
    }
    if (severity === 'High' || index === 1) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-[#B45309]" />
        </div>
      );
    }
    if (severity === 'Medium' || index === 2) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FEF3E8] border border-[#FCE4CB] flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#E87512]" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center shrink-0">
        <Info className="w-4 h-4 text-[#7C3AED]" />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E9DED2] shadow-card overflow-hidden flex flex-col justify-between h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-[#FFFDF9] border-b border-[#E9DED2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#E87512]" />
          <h3 className="text-xs font-bold text-textPrimary uppercase tracking-wider">
            Prioritized Action Queue
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
          {items.length > 0 ? `${items.length} Active Triggers` : '13 Active Triggers'}
        </span>
      </div>

      {/* Action Items List */}
      <div className="p-3 divide-y divide-[#E9DED2]/60 flex-1 flex flex-col justify-around">
        {displayItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => navigate(item.link_url || '/my-tasks')}
            className="py-2.5 px-2 hover:bg-[#FAF4EC] rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {getItemIcon(item.severity, idx)}
              <div className="min-w-0">
                <span className="text-xs font-bold text-textPrimary truncate block group-hover:text-[#8F2D16] transition-colors">
                  {item.title}
                </span>
                <span className="text-[11px] text-textSecondary truncate block mt-0.5">
                  {item.description}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-textMuted group-hover:text-[#8F2D16] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="px-4 py-2.5 bg-[#FFFDF9] border-t border-[#E9DED2] text-center">
        <button
          onClick={() => navigate('/my-tasks')}
          className="text-xs font-bold text-[#8F2D16] hover:text-[#73200E] inline-flex items-center gap-1 transition-colors"
        >
          <span>View All Actions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
