import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-borderLight rounded-xl p-8 shadow-card text-center">
        <div className="w-14 h-14 bg-red-50 text-govError rounded-full flex items-center justify-center mx-auto mb-4 border border-govError-border">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-govError bg-govError-light px-2.5 py-1 rounded">
          403 Access Restricted
        </span>
        <h1 className="text-xl font-bold text-textPrimary mt-3">Permission Denied</h1>
        <p className="text-sm text-textSecondary mt-2 leading-relaxed">
          Your current profile (<strong>{user?.roles[0]?.name || 'Current User'}</strong>) does not have
          the requisite security credentials or jurisdictional clearance to perform this action.
        </p>
        <div className="bg-slate-50 border border-borderLight rounded-lg p-3 text-xs text-textSecondary text-left my-4">
          <p className="font-semibold text-textPrimary flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-brand" /> Public-Sector Separation of Duties:
          </p>
          <p className="mt-1">
            Vendors cannot approve work, and inspectors cannot accept their own certifications. Switch to an
            appropriate administrative persona using the top banner to inspect this module.
          </p>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" icon={<Home className="w-4 h-4" />} onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
