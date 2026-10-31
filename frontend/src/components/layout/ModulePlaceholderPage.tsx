import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

interface ModulePlaceholderProps {
  moduleNumber: number;
  moduleTitle: string;
  description: string;
}

export const ModulePlaceholderPage: React.FC<ModulePlaceholderProps> = ({
  moduleNumber,
  moduleTitle,
  description,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-surface border border-borderLight rounded-2xl p-8 shadow-card text-center">
        <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Construction className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
          Module {moduleNumber} • Next In Pipeline
        </span>
        <h1 className="text-xl font-bold text-textPrimary mt-3">{moduleTitle}</h1>
        <p className="text-sm text-textSecondary mt-2 leading-relaxed">{description}</p>
        <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-borderLight text-xs text-textSecondary text-left">
          <strong className="text-textPrimary block mb-1">Module Progression Protocol:</strong>
          In accordance with the required implementation plan, Module 1 (Authentication, Users,
          Roles, & Permissions) is completed and awaiting user confirmation before advancing to this
          module.
        </div>
        <div className="mt-6 flex justify-center">
          <Button variant="primary" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
