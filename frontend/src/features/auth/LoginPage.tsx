import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

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
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-between font-sans">
      {/* Top Government Emblem Bar */}
      <div className="bg-surface border-b border-borderLight px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5 text-sky-200" />
          </div>
          <div>
            <span className="text-base font-bold text-brand tracking-tight">CivicProof</span>
            <span className="text-xs text-textSecondary ml-2 hidden sm:inline">
              Government Infrastructure Readiness & Asset Accountability
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-semibold">
            Godavari Pushkaralu 2027 Prototype
          </span>
        </div>
      </div>

      {/* Main Login Split View */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column: Standard Secure Login */}
        <div className="lg:col-span-5 bg-surface p-8 rounded-xl border border-borderLight shadow-card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-textPrimary tracking-tight">Official Sign In</h1>
            <p className="text-sm text-textSecondary mt-1">
              Authorized municipal administrators, field inspectors, and registered contractors.
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
        <div className="lg:col-span-7 bg-surface p-6 md:p-8 rounded-xl border border-borderLight shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h2 className="text-base font-bold text-textPrimary">Evaluator 1-Click Role Switcher</h2>
              </div>
              <p className="text-xs text-textSecondary mt-0.5">
                Click any persona below to authenticate instantly with seeded demo credentials.
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider bg-sky-50 text-sky-700 px-2.5 py-1 rounded border border-sky-200">
              7 Roles Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                onClick={() => handleQuickRole(account.email)}
                className="p-3.5 rounded-lg border border-borderLight bg-slate-50/50 hover:bg-brand-light/30 hover:border-brand/40 transition-all cursor-pointer group flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-brand group-hover:text-brand-hover">
                      {account.roleName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">1-click</span>
                  </div>
                  <p className="text-xs font-semibold text-textPrimary truncate">{account.name}</p>
                  <p className="text-[11px] text-textSecondary mt-1 leading-snug line-clamp-2">
                    {account.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-borderLight/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 truncate">{account.department}</span>
                  <span className="text-brand font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                    Enter &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-borderLight bg-surface text-center text-xs text-textSecondary">
        <p>CivicProof Platform — Godavari Pushkaralu 2027 Field Verification Architecture</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Prototype demonstration mode. Seeded data is purely synthetic.
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
