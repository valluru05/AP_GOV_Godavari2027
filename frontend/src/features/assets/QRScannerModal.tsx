import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Camera, AlertCircle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';
import type { Asset } from '../../types/asset';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resolvedAsset, setResolvedAsset] = useState<Asset | null>(null);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  const handleLookup = async (codeToLookup?: string) => {
    const target = (codeToLookup || inputCode).trim();
    if (!target) {
      setError('Please enter an Asset Code or QR Identifier.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResolvedAsset(null);
      const asset = await api.lookupAssetByQR(target);
      setResolvedAsset(asset);
    } catch (err: any) {
      setError(err.message || 'No asset found matching this QR identifier or code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = (sampleCode: string) => {
    setInputCode(sampleCode);
    setIsSimulatingCamera(true);
    setTimeout(() => {
      setIsSimulatingCamera(false);
      handleLookup(sampleCode);
    }, 600);
  };

  const handleGoToAsset = () => {
    if (resolvedAsset) {
      onClose();
      navigate(`/assets/${resolvedAsset.id}`);
    }
  };

  const handleClose = () => {
    setInputCode('');
    setError('');
    setResolvedAsset(null);
    setIsSimulatingCamera(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="QR Code Asset Scanner & Verification">
      <div className="space-y-5">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2.5">
          <QrCode className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">Pushkaralu 2027 Field Traceability Verification</p>
            <p>
              Scan physical QR tags placed on municipal infrastructure or enter the asset identifier. 
              The server validates credentials before displaying asset maintenance and readiness records.
            </p>
          </div>
        </div>

        {/* Viewfinder Mock / Scanner UI */}
        <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-950 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
          {isSimulatingCamera ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-emerald-400 font-mono text-sm tracking-wide">Decoding optical matrix...</p>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-2">
              <div className="relative">
                <Camera className="w-12 h-12 text-slate-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <p className="text-slate-300 font-medium text-sm">Optical Tag Scanner</p>
              <p className="text-slate-500 text-xs max-w-xs">
                Position the camera over the physical asset label or enter the identifier below.
              </p>
            </div>
          )}

          {/* Laser guideline animation */}
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-75 animate-pulse" />
        </div>

        {/* Quick Demo Pre-fills */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Quick Test Identifiers (Pushkaralu Assets)
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulateScan('AST-RO-KOTI-01')}
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded font-mono transition-colors"
            >
              AST-RO-KOTI-01 (RO Kiosk - Failed)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan('QR-AST-SN-PUSH-040')}
              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded font-mono transition-colors"
            >
              QR-AST-SN-PUSH-040 (Bio-Toilet - Ready)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan('AST-HM-KOTI-01')}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded font-mono transition-colors"
            >
              AST-HM-KOTI-01 (High-Mast - Pending)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan('AST-SAFE-SARA-01')}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded font-mono transition-colors"
            >
              AST-SAFE-SARA-01 (Barricade - Maint)
            </button>
          </div>
        </div>

        {/* Manual Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asset Code or Opaque QR Token
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. AST-RO-KOTI-01 or QR-AST-DW-KOTI-001"
                className="w-full pl-9 pr-24 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Lookup'}
              </Button>
            </div>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Resolved Asset Preview Card */}
        {resolvedAsset && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {resolvedAsset.asset_code}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{resolvedAsset.name}</h4>
                <p className="text-xs text-slate-500">{resolvedAsset.location_name || resolvedAsset.zone_name}</p>
              </div>
              <Badge variant={resolvedAsset.readiness_badge_variant} className="text-xs">
                {resolvedAsset.readiness_badge_text}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                <span className="font-medium text-slate-800 truncate block">
                  {resolvedAsset.department || 'Municipal Administration'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                <span className="font-medium text-slate-800">{resolvedAsset.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Defects</span>
                <span className={resolvedAsset.open_defect_count > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                  {resolvedAsset.open_defect_count > 0 ? `${resolvedAsset.open_defect_count} Unresolved` : '0 (Clear)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Operational State</span>
                <span className={resolvedAsset.is_operationally_ready ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-amber-700 font-medium'}>
                  {resolvedAsset.is_operationally_ready ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Ready
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                      Not Ready
                    </>
                  )}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full justify-center gap-2"
              onClick={handleGoToAsset}
            >
              Open Complete Asset Dossier
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
