import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Shield, AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('CivicProof Uncaught UI Exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4 font-sans text-[#172B4D]">
          <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-[#1E3A8A] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <h1 className="font-bold text-base tracking-tight leading-tight">CivicProof System Recovery</h1>
                  <p className="text-xs text-sky-200">Government of Andhra Pradesh — Godavari Pushkaralu 2027</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20">Client Recovery</span>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Unexpected Interface Interruption</h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    The platform encountered a client-side execution issue while rendering this view. Your session credentials and queued offline records remain securely preserved.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={this.handleReload}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-[#1E40AF] transition-colors shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <Home className="w-4 h-4" />
                  Return to Dashboard
                </button>
              </div>

              {/* Diagnostic Collapsible */}
              <div className="mt-6">
                <button
                  onClick={this.toggleDetails}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${this.state.showDetails ? 'rotate-180' : ''}`} />
                  {this.state.showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics for engineers'}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                    <p className="text-rose-400 font-bold mb-1">{this.state.error?.toString()}</p>
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-400">
                      {this.state.errorInfo?.componentStack || 'No component stack trace available.'}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Section 19 Invariant: Audit Ledger Preserved</span>
              <span>CivicProof v1.0.0</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
