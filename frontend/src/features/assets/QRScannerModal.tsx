import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  UploadCloud,
  Search,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  QrCode,
  ShieldCheck,
  MapPin,
  Building,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';
import type { Asset } from '../../types/asset';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetResolved?: (asset: Asset) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onAssetResolved,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Active UI modes: 'camera' | 'manual' | 'file'
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'file'>('camera');

  // Scanner state
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Lookup state
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resolvedAsset, setResolvedAsset] = useState<Asset | null>(null);
  const [fileScanStatus, setFileScanStatus] = useState<string>('');

  const scannerContainerId = 'civicproof-html5-qr-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize decoded string (handle full URLs or identifiers)
  const extractCleanIdentifier = (decodedStr: string): string => {
    let clean = decodedStr.trim();
    if (clean.includes('/qr/')) {
      clean = clean.split('/qr/').pop()?.split(/[?#/]/)[0] || clean;
    } else if (clean.includes('/assets/')) {
      clean = clean.split('/assets/').pop()?.split(/[?#/]/)[0] || clean;
    }
    return clean.trim();
  };

  // Perform API lookup
  const handleLookup = async (codeToLookup: string) => {
    const target = extractCleanIdentifier(codeToLookup);
    if (!target) {
      setErrorMessage(t('qr.manualPlaceholder'));
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setResolvedAsset(null);
      const asset = await api.lookupAssetByQR(target);
      setResolvedAsset(asset);
      if (onAssetResolved) {
        onAssetResolved(asset);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('qr.assetNotFound'));
    } finally {
      setLoading(false);
    }
  };

  // Cleanup scanner helper
  const stopScanner = async (instance?: Html5Qrcode | null) => {
    const scanner = instance || scannerInstance;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
    setTorchEnabled(false);
  };

  // Start Camera Scanning
  const startCameraScanning = async () => {
    setErrorMessage('');
    setResolvedAsset(null);

    // Stop existing instance first if any
    await stopScanner();

    try {
      const element = document.getElementById(scannerContainerId);
      if (!element) {
        console.warn('Scanner element not mounted yet.');
        return;
      }

      const html5Qr = new Html5Qrcode(scannerContainerId);
      setScannerInstance(html5Qr);

      // Enumerate available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        setAvailableCameras(devices);
        if (devices.length > 0 && !selectedCameraId) {
          // Prefer back/environment camera
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      } catch (e) {
        console.warn('Could not list cameras:', e);
      }

      // Camera configuration: rear camera priority
      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: 'environment' };

      await html5Qr.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Successfully decoded QR code!
          console.info('QR Decoded:', decodedText);
          // Pause/stop to prevent duplicate triggers
          await stopScanner(html5Qr);
          await handleLookup(decodedText);
        },
        () => {
          // Frame scan failure (expected between frames)
        }
      );

      setCameraPermissionGranted(true);
      setIsScanning(true);

      // Check torch capabilities
      try {
        const capabilities = html5Qr.getRunningTrackCameraCapabilities();
        if (capabilities?.torchFeature?.()?.isSupported?.()) {
          setIsTorchSupported(true);
        }
      } catch {
        setIsTorchSupported(false);
      }
    } catch (err: any) {
      console.error('Camera start failure:', err);
      setIsScanning(false);
      const errStr = (err?.name || err?.message || String(err)).toLowerCase();
      if (
        errStr.includes('notallowed') ||
        errStr.includes('permission') ||
        errStr.includes('denied')
      ) {
        setCameraPermissionGranted(false);
        setErrorMessage(t('qr.permissionDesc'));
      } else {
        setCameraPermissionGranted(false);
        setErrorMessage(t('qr.cameraNotAvailable'));
      }
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!scannerInstance || !isScanning) return;
    try {
      const nextState = !torchEnabled;
      await scannerInstance.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchEnabled(nextState);
    } catch (err) {
      console.warn('Could not toggle torch:', err);
    }
  };

  // Switch between cameras (front/back)
  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextCamera = availableCameras[(currentIndex + 1) % availableCameras.length];
    setSelectedCameraId(nextCamera.id);
  };

  // Scan QR code from an uploaded image file
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setFileScanStatus('Analyzing image file for optical matrix...');
      setErrorMessage('');
      setResolvedAsset(null);

      const html5Qr = scannerInstance || new Html5Qrcode(scannerContainerId);
      const decodedText = await html5Qr.scanFile(file, false);
      setFileScanStatus('');
      await handleLookup(decodedText);
    } catch (err: any) {
      setFileScanStatus('');
      setErrorMessage(
        'Could not decode a valid QR code from this image. Please ensure the tag is well-lit and unobstructed.'
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // When modal opens/closes or changes tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCameraScanning();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, selectedCameraId]);

  // Clean unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleClose = async () => {
    await stopScanner();
    setInputCode('');
    setErrorMessage('');
    setResolvedAsset(null);
    setCameraPermissionGranted(null);
    onClose();
  };

  const handleNavigateToAsset = () => {
    if (resolvedAsset) {
      handleClose();
      navigate(`/assets/${resolvedAsset.id}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('qr.modalTitle')}
      description={t('qr.fieldTraceability')}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs (Camera vs Manual Code vs File Upload) */}
        <div className="flex border-b border-[#E9DED2] -mx-1 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'camera'
                ? 'border-[#8F2D16] text-[#8F2D16]'
                : 'border-transparent text-[#7C7168] hover:text-[#35251E]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{t('qr.opticalScanner')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-[#8F2D16] text-[#8F2D16]'
                : 'border-transparent text-[#7C7168] hover:text-[#35251E]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>{t('common.search')} / Manual ID</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-[#8F2D16] text-[#8F2D16]'
                : 'border-transparent text-[#7C7168] hover:text-[#35251E]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('qr.uploadQrImage')}</span>
          </button>
        </div>

        {/* Tab 1: Live Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Viewfinder Area */}
            <div className="relative rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner min-h-[280px] flex items-center justify-center">
              {/* HTML5 QR reader DOM target */}
              <div
                id={scannerContainerId}
                className="w-full h-full max-w-sm mx-auto overflow-hidden"
              />

              {/* Scanning Overlay Reticle and Line (Active during scanning) */}
              {isScanning && !resolvedAsset && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-white/40 rounded-xl relative overflow-hidden shadow-2xl">
                    {/* Reticle corner accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-[#E87512]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-[#E87512]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-[#E87512]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-[#E87512]" />

                    {/* Animated scanning laser line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#E87512] to-transparent shadow-[0_0_8px_#E87512] animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                  <span className="mt-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[11px] font-medium text-white/90">
                    {t('qr.cameraSubtext')}
                  </span>
                </div>
              )}

              {/* Camera Permission Denied or Unavailable State */}
              {cameraPermissionGranted === false && !resolvedAsset && (
                <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center text-white">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {t('qr.permissionRequired')}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs mb-4">
                    {t('qr.permissionDesc')}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button size="sm" variant="primary" onClick={startCameraScanning}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      {t('qr.enableCamera')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('manual')}>
                      {t('qr.manualEntryTitle')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls Bar (Torch, Switch Camera, Restart) */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#FAF4EC] rounded-xl border border-[#E9DED2] text-xs">
              <div className="flex items-center gap-2">
                {availableCameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E9DED2] text-[#35251E] hover:bg-[#FFF8EE]"
                    title={t('qr.switchCamera')}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#E87512]" />
                    <span>{t('qr.switchCamera')}</span>
                  </button>
                )}
                {isTorchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                      torchEnabled
                        ? 'bg-[#E87512] text-white border-[#E87512]'
                        : 'bg-white border-[#E9DED2] text-[#35251E] hover:bg-[#FFF8EE]'
                    }`}
                  >
                    {torchEnabled ? (
                      <>
                        <FlashlightOff className="w-3.5 h-3.5" />
                        <span>{t('qr.torchOff')}</span>
                      </>
                    ) : (
                      <>
                        <Flashlight className="w-3.5 h-3.5 text-[#E87512]" />
                        <span>{t('qr.torchOn')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <span className="text-[11px] text-[#7C7168] font-mono">
                {isScanning ? t('qr.scanningActive') : 'Camera ready'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Code Lookup */}
        {activeTab === 'manual' && (
          <div className="space-y-4 py-2">
            <div className="bg-[#FFF8EE] border border-[#E9DED2] rounded-xl p-4">
              <label className="block text-xs font-bold text-[#35251E] mb-1.5">
                {t('qr.manualEntryTitle')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C7168]" />
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup(inputCode)}
                    placeholder={t('qr.manualPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E9DED2] bg-white focus:outline-none focus:ring-2 focus:ring-[#8F2D16] focus:border-[#8F2D16] font-mono"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleLookup(inputCode)}
                  disabled={loading || !inputCode.trim()}
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
                  {t('qr.verifyLookup')}
                </Button>
              </div>
              <p className="text-[11px] text-[#7C7168] mt-2 leading-relaxed">
                Enter an asset code (e.g. <span className="font-mono font-semibold text-[#8F2D16]">AST-DW-001</span>), 
                opaque QR token (e.g. <span className="font-mono font-semibold text-[#8F2D16]">QR-2027-GHAT</span>), 
                or paste a verification URL.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Upload QR Photo */}
        {activeTab === 'file' && (
          <div className="space-y-4 py-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E9DED2] hover:border-[#8F2D16] rounded-2xl p-6 bg-[#FAF4EC]/50 hover:bg-[#FAF4EC] flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#FEF3E8] text-[#8F2D16] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#35251E] mb-1">
                {t('qr.uploadQrPrompt')}
              </h4>
              <p className="text-xs text-[#7C7168] max-w-sm mb-3">
                Select an image file (PNG, JPG, WEBP) from your device. The optical decoder will read the tag matrix automatically.
              </p>
              <Button size="sm" variant="outline" type="button">
                Select Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
              />
            </div>
            {fileScanStatus && (
              <p className="text-xs text-center text-[#8F2D16] animate-pulse font-medium">
                {fileScanStatus}
              </p>
            )}
          </div>
        )}

        {/* Error Feedback Display */}
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{t('common.error')}: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Resolved Asset Card (Appears immediately upon scanning / lookup) */}
        {resolvedAsset && (
          <div className="p-4 bg-white border-2 border-[#15803D] rounded-2xl shadow-card space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-[#FAF4EC] px-2 py-0.5 rounded border border-[#E9DED2] text-[#35251E]">
                      {resolvedAsset.asset_code}
                    </span>
                    <Badge variant={resolvedAsset.lifecycle_status === 'Active' ? 'success' : 'warning'}>
                      {resolvedAsset.lifecycle_status}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#35251E] mt-0.5">
                    {resolvedAsset.name}
                  </h4>
                </div>
              </div>

              {resolvedAsset.is_operationally_ready ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t('assets.ready')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('assets.notReady')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#FAF4EC]">
              <div className="flex items-center gap-1.5 text-[#7C7168]">
                <Building className="w-3.5 h-3.5 text-[#8F2D16] shrink-0" />
                <span className="truncate">{resolvedAsset.category}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#7C7168]">
                <MapPin className="w-3.5 h-3.5 text-[#E87512] shrink-0" />
                <span className="truncate">{resolvedAsset.location_name}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleNavigateToAsset}
              >
                <span>{t('qr.openDetails')}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResolvedAsset(null);
                  if (activeTab === 'camera') {
                    startCameraScanning();
                  }
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                {t('qr.tryAgain')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
