import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';
import { ApGovernmentSeal, PushkaraluKalash, CivicProofLotusLogo } from '../../components/common/BrandEmblems';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(email);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetSuccess(null);
    try {
      const res = await api.resetPassword(resetEmail, newPassword);
      setResetSuccess(res.message);
      setTimeout(() => {
        setResetModalOpen(false);
        setResetSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8EE] flex flex-col justify-between font-sans">
      {/* Top Government Emblem Bar */}
      <header className="bg-white border-b border-[#E9DED2] px-4 sm:px-8 py-3 flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5 pr-4 border-r border-[#E9DED2]">
            <ApGovernmentSeal className="w-9 h-9 shrink-0 drop-shadow-sm" />
            <div className="hidden sm:flex flex-col">
              <span className="text-[12px] font-bold text-[#166534] tracking-tight leading-none">
                Government of
              </span>
              <span className="text-[12px] font-bold text-[#166534] tracking-tight leading-tight">
                Andhra Pradesh
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PushkaraluKalash className="w-9 h-9 shrink-0 drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-[#8F2D16] tracking-tight font-serif leading-none">
                Godavari Pushkaralu 2027
              </span>
              <span className="text-[11px] text-textSecondary font-medium mt-0.5 tracking-tight hidden sm:inline">
                Infrastructure Readiness Command Center
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-[#FEF3E8] text-[#8F2D16] border border-[#FCE4CB] rounded-full font-bold">
            Official Government Portal
          </span>
        </div>
      </header>

      {/* Main Login Split View */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column: Standard Secure Login */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#E9DED2] shadow-card">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CivicProofLotusLogo className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8F2D16]">
                CivicProof Platform
              </span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">Official Sign In</h1>
            <p className="text-xs text-textSecondary mt-1 leading-relaxed">
              Authorized municipal administrators, field inspectors, project engineers, and verified vendors.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-govError-light border border-govError-border rounded-lg flex items-start gap-2.5 text-xs text-govError">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-textPrimary mb-1">
                Username or Official Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-textSecondary absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. superadmin@civicproof.gov.in"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-borderLight rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-textPrimary">Password</label>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Forgot / Reset?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-textSecondary absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-borderLight rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Platform
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-borderLight text-center">
            <p className="text-xs text-textSecondary">
              Protected by server-side Argon2id encryption & role-based audit logging.
            </p>
          </div>
        </div>

        {/* Right Column: 1-Click Demo Account Quick Selector for Evaluators */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E9DED2] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E87512]" />
                <h2 className="text-base font-bold text-textPrimary">Evaluator 1-Click Official Persona</h2>
              </div>
              <p className="text-xs text-textSecondary mt-0.5">
                Click any official profile to authenticate instantly and test role-based dashboards.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-[#FEF3E8] text-[#8F2D16] px-2.5 py-1 rounded-full border border-[#FCE4CB]">
              7 Roles Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                onClick={() => handleQuickRole(account.email)}
                className="p-3.5 rounded-xl border border-[#E9DED2] bg-[#FFFDF9] hover:bg-[#FDF2EB] hover:border-[#8F2D16] transition-all cursor-pointer group flex flex-col justify-between text-left shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-[#8F2D16]">
                      {account.roleName}
                    </span>
                    <span className="text-[10px] text-[#E87512] font-semibold">1-click</span>
                  </div>
                  <p className="text-xs font-semibold text-textPrimary truncate">{account.name}</p>
                  <p className="text-[11px] text-textSecondary mt-1 leading-snug line-clamp-2">
                    {account.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E9DED2]/60 flex items-center justify-between text-[11px]">
                  <span className="text-textMuted truncate font-mono text-[10px]">{account.department}</span>
                  <span className="text-[#8F2D16] font-bold group-hover:translate-x-0.5 transition-transform flex items-center text-xs">
                    Login &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-[#E9DED2] bg-white text-center text-xs text-textSecondary">
        <p className="font-semibold text-textPrimary">
          CivicProof Platform &bull; Godavari Pushkaralu 2027 Infrastructure Readiness Cell
        </p>
        <p className="text-[11px] text-textSecondary mt-0.5">
          Government of Andhra Pradesh &bull; Rajamahendravaram Municipal Corporation
        </p>
      </footer>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Password"
        description="Demo password recovery workflow. Updates password in database with audit event."
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetSuccess && (
            <div className="p-3 bg-govSuccess-light text-govSuccess text-xs rounded-lg border border-govSuccess-border flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              Account Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. superadmin@civicproof.gov.in"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-textPrimary mb-1">
              New Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-borderLight rounded-lg text-textPrimary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={resetLoading}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
