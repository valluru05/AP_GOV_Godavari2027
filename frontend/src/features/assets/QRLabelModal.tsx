import React from 'react';
import { Printer, ShieldCheck, AlertTriangle, Building2, MapPin } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { AssetQRLabel } from '../../types/asset';

interface QRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelData: AssetQRLabel | null;
}

export const QRLabelModal: React.FC<QRLabelModalProps> = ({ isOpen, onClose, labelData }) => {
  if (!labelData) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label — ${labelData.asset_code}</title>
          <style>
            @page {
              size: 4in 3.5in;
              margin: 0.2in;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .label-card {
              width: 3.6in;
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 12px;
              box-sizing: border-box;
              background: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .header h4 {
              margin: 0;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #1e3a8a;
              font-weight: 800;
            }
            .header h5 {
              margin: 2px 0 0 0;
              font-size: 9px;
              color: #64748b;
              font-weight: 600;
            }
            .content-row {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .qr-col {
              flex-shrink: 0;
              text-align: center;
            }
            .qr-col img {
              width: 110px;
              height: 110px;
              display: block;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
            }
            .info-col {
              flex-grow: 1;
              min-width: 0;
            }
            .asset-code {
              font-family: monospace;
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
              margin-bottom: 4px;
            }
            .asset-name {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.25;
              margin: 0 0 4px 0;
            }
            .meta-text {
              font-size: 8.5px;
              color: #475569;
              margin: 2px 0;
            }
            .status-badge {
              display: inline-block;
              font-size: 8px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 9999px;
              margin-top: 4px;
              text-transform: uppercase;
              background: ${labelData.is_operationally_ready ? '#dcfce7' : '#fef3c7'};
              color: ${labelData.is_operationally_ready ? '#166534' : '#92400e'};
              border: 1px solid ${labelData.is_operationally_ready ? '#bbf7d0' : '#fde68a'};
            }
            .footer {
              margin-top: 8px;
              padding-top: 5px;
              border-top: 1px dashed #cbd5e1;
              font-size: 7.5px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">
              <h4>GOVERNMENT OF ANDHRA PRADESH</h4>
              <h5>GODAVARI PUSHKARALU 2027 — ASSET ACCOUNTABILITY TAG</h5>
            </div>
            <div class="content-row">
              <div class="qr-col">
                <img src="${labelData.qr_data_url}" alt="QR Matrix" />
                <div style="font-size: 7px; color: #94a3b8; margin-top: 2px; font-family: monospace;">
                  ${labelData.qr_identifier}
                </div>
              </div>
              <div class="info-col">
                <div class="asset-code">${labelData.asset_code}</div>
                <div class="asset-name">${labelData.asset_name}</div>
                <div class="meta-text"><strong>Dept:</strong> ${labelData.department || 'Municipal Administration'}</div>
                <div class="meta-text"><strong>Ghat:</strong> ${labelData.location_name || labelData.zone_name || 'Rajamahendravaram'}</div>
                <div class="status-badge">
                  ${labelData.is_operationally_ready ? '✓ OPERATIONALLY READY' : '⚠ PENDING VERIFICATION'}
                </div>
              </div>
            </div>
            <div class="footer">
              Official Property of Municipal Administration. Tampering or unauthorized removal is punishable under AP Municipalities Act. Scan QR to verify field inspection history.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Physical Asset QR Tag">
      <div className="space-y-5">
        <p className="text-xs text-slate-500">
          This printable label is formatted for standard weather-resistant thermal vinyl adhesive tags affixed to physical infrastructure for field inspection scanning during Godavari Pushkaralu 2027.
        </p>

        {/* Realistic Asset Tag Preview */}
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex justify-center">
          <div className="w-full max-w-sm bg-white border-2 border-slate-900 rounded-lg p-3.5 shadow-md text-slate-900">
            {/* Tag Header */}
            <div className="text-center border-b border-slate-200 pb-2 mb-3">
              <div className="flex items-center justify-center gap-1.5 text-brand-800 text-[11px] font-extrabold uppercase tracking-wide">
                <Building2 className="w-3.5 h-3.5" />
                Government of Andhra Pradesh
              </div>
              <div className="text-[9px] font-bold text-slate-600 tracking-tight">
                GODAVARI PUSHKARALU 2027 — ASSET ACCOUNTABILITY TAG
              </div>
            </div>

            {/* Tag Body */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <img
                  src={labelData.qr_data_url}
                  alt={`QR for ${labelData.asset_code}`}
                  className="w-24 h-24 border border-slate-200 rounded p-1 bg-white"
                />
                <div className="text-[7px] font-mono text-slate-400 mt-0.5 truncate max-w-[96px]">
                  {labelData.qr_identifier}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <span className="inline-block font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                  {labelData.asset_code}
                </span>
                <h4 className="font-bold text-xs text-slate-900 leading-tight">
                  {labelData.asset_name}
                </h4>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <div className="truncate">
                    <span className="font-semibold text-slate-700">Dept:</span> {labelData.department || 'Municipal Administration'}
                  </div>
                  <div className="truncate flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{labelData.location_name || labelData.zone_name || 'Rajamahendravaram'}</span>
                  </div>
                </div>

                <div className="pt-1">
                  {labelData.is_operationally_ready ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Operationally Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tag Footer */}
            <div className="mt-3 pt-2 border-t border-dashed border-slate-200 text-[8px] text-slate-400 text-center leading-normal">
              Statutory Property of AP Municipal Administration. Scan QR code using CivicProof mobile terminal to inspect maintenance and readiness ledger.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="primary" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Print Physical Asset Label
          </Button>
        </div>
      </div>
    </Modal>
  );
};
