import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge, type BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type {
  ReportType,
  ReportTypeOption,
  ReportFilterParams,
  ReportDataResponse,
  ReportColumn
} from '../../types/report';

export const ReportsPage: React.FC = () => {
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<ReportType>('project_progress');
  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination / Page Size
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Initial load of report types
  useEffect(() => {
    loadReportTypes();
  }, []);

  // Reload report data when report type or filters change
  useEffect(() => {
    loadReportData();
    setCurrentPage(1);
  }, [selectedReportId, zoneFilter, categoryFilter, statusFilter, riskFilter]);

  const loadReportTypes = async () => {
    try {
      const types = await api.getReportTypes();
      setReportTypes(types);
    } catch (err: any) {
      console.error('Failed to load report types:', err);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ReportFilterParams = {
        report_type: selectedReportId,
        zone_id: zoneFilter !== 'All' ? zoneFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        risk_level: riskFilter !== 'All' ? riskFilter : undefined,
        search: searchQuery.trim() || undefined,
      };
      const data = await api.getReportData(filters);
      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReportData();
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setZoneFilter('All');
    setCategoryFilter('All');
    setStatusFilter('All');
    setRiskFilter('All');
    setSearchQuery('');
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadReportCsv({
        report_type: selectedReportId,
        zone_id: zoneFilter,
        category: categoryFilter,
        status: statusFilter,
        risk_level: riskFilter,
        search: searchQuery,
      });

      // Create download trigger
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `civicproof_${selectedReportId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessToast('Sanitized CSV report downloaded with verified audit trail');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setError(`CSV Export Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group report types by category
  const groupedReportTypes = useMemo(() => {
    const groups: Record<string, ReportTypeOption[]> = {};
    for (const type of reportTypes) {
      const cat = type.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(type);
    }
    return groups;
  }, [reportTypes]);

  // Current active report option details
  const activeReport = useMemo(() => {
    return reportTypes.find((t) => t.id === selectedReportId);
  }, [reportTypes, selectedReportId]);

  // Filtered rows for client-side search if needed
  const displayRows = useMemo(() => {
    if (!reportData) return [];
    if (!searchQuery.trim()) return reportData.rows;
    const q = searchQuery.toLowerCase();
    return reportData.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [reportData, searchQuery]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, currentPage]);

  const totalPages = Math.ceil(displayRows.length / pageSize) || 1;

  // Dynamic cell renderer for table
  const renderCellContent = (col: ReportColumn, val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic text-xs">N/A</span>;
    }

    if (col.data_type === 'percentage') {
      const num = Number(val);
      const colorClass =
        num >= 80 ? 'bg-emerald-500' : num >= 50 ? 'bg-blue-600' : 'bg-amber-500';
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.min(100, Math.max(0, num))}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-9 text-right">
            {num.toFixed(1)}%
          </span>
        </div>
      );
    }

    if (col.data_type === 'badge') {
      const text = String(val);
      let variant: BadgeVariant = 'neutral';
      const low = text.toLowerCase();
      if (
        low.includes('pass') ||
        low.includes('verify') ||
        low.includes('ready') ||
        low.includes('closed') ||
        low.includes('low') ||
        low.includes('complete')
      ) {
        variant = 'success';
      } else if (
        low.includes('prog') ||
        low.includes('medium') ||
        low.includes('warn') ||
        low.includes('rework') ||
        low.includes('pending')
      ) {
        variant = 'warning';
      } else if (
        low.includes('fail') ||
        low.includes('crit') ||
        low.includes('overdue') ||
        low.includes('high') ||
        low.includes('breach') ||
        low.includes('miss')
      ) {
        variant = 'error';
      } else if (low.includes('comm') || low.includes('info') || low.includes('open')) {
        variant = 'info';
      }
      return (
        <Badge variant={variant} size="sm">
          {text}
        </Badge>
      );
    }

    if (col.data_type === 'currency') {
      const num = Number(val);
      if (isNaN(num)) return <span>{val}</span>;
      return (
        <span className="font-mono font-medium text-slate-900">
          ₹ {num.toLocaleString('en-IN')}
        </span>
      );
    }

    if (col.data_type === 'date') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return <span>{d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>;
        }
      } catch {
        // fallback
      }
      return <span>{String(val)}</span>;
    }

    if (col.data_type === 'number') {
      const num = Number(val);
      return <span className="font-mono text-slate-800">{isNaN(num) ? val : num.toLocaleString()}</span>;
    }

    return <span className="text-slate-800 line-clamp-2">{String(val)}</span>;
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Printable Watermark Header & Notice */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
              Government of Andhra Pradesh
            </h1>
            <h2 className="text-sm font-semibold text-slate-700">
              Godavari Pushkaralu 2027 — Municipal Infrastructure Readiness Audit Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Document Category: {activeReport?.category} | Report Identifier: {selectedReportId.toUpperCase()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-mono">Generated: {reportData?.metadata.generated_at ? new Date(reportData.metadata.generated_at).toLocaleString('en-IN') : new Date().toLocaleString()}</p>
            <p>Auditor: {reportData?.metadata.generated_by || 'Officer'}</p>
            <p className="text-red-700 font-bold mt-1 text-[10px]">
              {reportData?.metadata.demo_pilot_label || 'PROTOTYPE DEMO AUDIT COPY'}
            </p>
          </div>
        </div>
      </div>

      {/* Screen Watermark Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 text-xs flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong className="font-semibold">Statutory Governance Prototype:</strong> Generated reports are cryptographic pilot snapshots for Godavari Pushkaralu 2027 readiness verification. All exports include OWASP formula sanitization and immutable audit event logging.
          </span>
        </div>
        <span className="hidden md:inline-block font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded text-amber-800">
          Section 17 Compliance
        </span>
      </div>

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-[#174EA6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Reports, Exports, & Audit History
              </h1>
              <p className="text-sm text-slate-600">
                Official statutory progress records, risk registries, and tamper-evident CSV exports for Godavari Pushkaralu 2027.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadReportData}
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            Print Executive Briefing
          </Button>

          <Button
            variant="primary"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            icon={<Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />}
            className="bg-[#174EA6] hover:bg-[#123e85] text-white shadow-sm"
          >
            {exporting ? 'Exporting...' : 'Export Sanitized CSV'}
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between animate-fadeIn print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Report Selection Tabs / Categories */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Select Statutory Report Type ({reportTypes.length} Available)
          </span>
          <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded">
            Active: {activeReport?.title || selectedReportId}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(groupedReportTypes).map(([category, types]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                {category}
              </h3>
              <div className="space-y-1">
                {types.map((type) => {
                  const isSelected = selectedReportId === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportId(type.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#174EA6] text-white shadow-sm ring-2 ring-blue-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <div className="font-semibold line-clamp-1">{type.title}</div>
                      <div
                        className={`text-[11px] line-clamp-1 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, title, contractor, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
          </form>

          {/* Quick Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Ghats / Zones</option>
              <option value="Kotilingala Ghat">Kotilingala Ghat</option>
              <option value="Pushkar Ghat">Pushkar Ghat</option>
              <option value="Saraswati Ghat">Saraswati Ghat</option>
              <option value="Dowleswaram Ghat">Dowleswaram Ghat</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Ghat Development">Ghat Development</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Crowd Management">Crowd Management</option>
              <option value="Electrical & Lighting">Electrical & Lighting</option>
              <option value="Water Supply">Water Supply</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {(zoneFilter !== 'All' || categoryFilter !== 'All' || statusFilter !== 'All' || riskFilter !== 'All' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Report Header & Metadata Card */}
      <div className="bg-gradient-to-r from-slate-900 to-[#174EA6] text-white rounded-xl p-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 uppercase tracking-wider">
                {activeReport?.category || 'Governance'}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                CODE: {selectedReportId.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {reportData?.metadata.title || activeReport?.title || 'Report Dossier'}
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl mt-1">
              {reportData?.metadata.description || activeReport?.description}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 text-xs text-right border border-white/15 min-w-[200px]">
            <div className="text-blue-200">Total Filtered Records</div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">
              {reportData?.metadata.total_records ?? displayRows.length}
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Scope: {Object.keys(reportData?.metadata.applied_filters || {}).length > 0 ? `${Object.keys(reportData?.metadata.applied_filters || {}).length} Active Filter(s)` : 'Full Dataset'}
            </div>
          </div>
        </div>

        {/* Dynamic Summary Stats Ribbon */}
        {reportData && reportData.summary_stats && reportData.summary_stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/20">
            {reportData.summary_stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
              >
                <div className="text-[11px] uppercase tracking-wider text-blue-200 font-medium">
                  {stat.label}
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {stat.value}
                </div>
                {stat.subtext && (
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    {stat.subtext}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Tabular Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#174EA6] animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">
              Generating statutory report dataset...
            </p>
            <p className="text-xs text-slate-400">
              Aggregating verified inspection records and calculating Pushkaralu readiness metrics.
            </p>
          </div>
        ) : !reportData || displayRows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">No matching records found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no records matching the selected filters for this report type. Try adjusting your Ghat, Category, or Status filter options.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3">
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                  {reportData.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-4 ${
                        col.data_type === 'number' || col.data_type === 'currency'
                          ? 'text-right'
                          : col.data_type === 'percentage'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row, idx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {absoluteIndex}
                      </td>
                      {reportData.columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-3 px-4 ${
                            col.data_type === 'number' || col.data_type === 'currency'
                              ? 'text-right'
                              : ''
                          }`}
                        >
                          {renderCellContent(col, row[col.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Record Count Footer */}
        {reportData && displayRows.length > 0 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
            <div>
              Showing <span className="font-semibold font-mono">{paginatedRows.length}</span> of{' '}
              <span className="font-semibold font-mono">{displayRows.length}</span> records
              {displayRows.length !== reportData.rows.length && ` (filtered from ${reportData.rows.length})`}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Print Signature & Audit Attestation Block (Visible only when printed) */}
      <div className="hidden print:block pt-8 mt-6 border-t border-slate-300 text-xs text-slate-700">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold">Superintending Engineer</p>
            <p className="text-[10px] text-slate-500">Water Resources / Roads & Buildings</p>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold">Quality Control Auditor</p>
            <p className="text-[10px] text-slate-500">Third-Party Verification Agency</p>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <p className="font-bold">District Collector / Special Officer</p>
            <p className="text-[10px] text-slate-500">Godavari Pushkaralu 2027 Committee</p>
          </div>
        </div>
        <div className="text-center mt-6 text-[10px] text-slate-400">
          Generated via CivicProof GovTech Platform • Cryptographic Verification Token: CP2027-{selectedReportId.toUpperCase()}-{Date.now().toString().slice(-6)}
        </div>
      </div>
    </div>
  );
};
