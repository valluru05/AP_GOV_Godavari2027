import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-borderLight rounded-xl p-8 shadow-card text-center">
        <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <FileQuestion className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
          404 Not Found
        </span>
        <h1 className="text-xl font-bold text-textPrimary mt-3">Record or Page Not Found</h1>
        <p className="text-sm text-textSecondary mt-2">
          The requested infrastructure record, work package, or administrative view does not exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="primary" size="sm" icon={<Home className="w-4 h-4" />} onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
