import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import type { Vendor, VendorCreatePayload } from '../../types/vendor';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

export const VendorListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register form state
  const [formData, setFormData] = useState<VendorCreatePayload>({
    vendor_code: '',
    company_name: '',
    category: 'Civil & Hydraulic Infrastructure',
    contact_name: '',
    email: '',
    phone: '',
    contract_reference: '',
    status: 'Active',
    contract_start_date: '',
    contract_end_date: '',
    compliance_status: 'Compliant',
    compliance_document_ref: '',
  });

  const canManageVendors = user?.roles.some((r) =>
    ['super_admin', 'municipal_admin', 'project_manager'].includes(r.id)
  );

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors({
        search: search || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setVendors(data);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setRegistering(true);
    try {
      await api.registerVendor(formData);
      setIsRegisterModalOpen(false);
      setFormData({
        vendor_code: '',
        company_name: '',
        category: 'Civil & Hydraulic Infrastructure',
        contact_name: '',
        email: '',
        phone: '',
        contract_reference: '',
        status: 'Active',
        contract_start_date: '',
        contract_end_date: '',
        compliance_status: 'Compliant',
        compliance_document_ref: '',
      });
      fetchVendors();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register contractor');
    } finally {
      setRegistering(false);
    }
  };

  const totalContractors = vendors.length;
  const activeContracts = vendors.reduce((acc, v) => acc + (v.active_packages_count || 0), 0);
  const compliantCount = vendors.filter((v) => v.compliance_status === 'Compliant').length;
  const renewalDueCount = vendors.filter((v) => v.compliance_status === 'Renewal Due').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-light text-brand rounded-full uppercase tracking-wider">
              Module 04
            </span>
            <span className="text-xs text-slate-500 font-medium">Pushkaralu 2027 Execution</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-brand" />
            Contractor & Service-Provider Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registered infrastructure vendors, statutory compliance status, and assigned public work packages.
          </p>
        </div>

        {canManageVendors && (
          <Button
            id="register-vendor-btn"
            variant="primary"
            onClick={() => setIsRegisterModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Register Contractor
          </Button>
        )}
      </div>

      {/* High-Level Accountability Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Contractors</span>
            <Building2 className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalContractors}</p>
          <span className="text-xs text-slate-500 mt-0.5 block">Vetted and empaneled</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Work Packages</span>
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{activeContracts}</p>
          <span className="text-xs text-slate-500 mt-0.5 block">Under execution on site</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-govSuccess uppercase tracking-wider">Compliant Vendors</span>
            <CheckCircle2 className="w-4 h-4 text-govSuccess" />
          </div>
          <p className="text-2xl font-bold text-govSuccess mt-2">{compliantCount}</p>
          <span className="text-xs text-slate-500 mt-0.5 block">Valid statutory credentials</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-govWarning uppercase tracking-wider">Renewal Due</span>
            <AlertTriangle className="w-4 h-4 text-govWarning" />
          </div>
          <p className="text-2xl font-bold text-govWarning mt-2">{renewalDueCount}</p>
          <span className="text-xs text-slate-500 mt-0.5 block">Action required within 30 days</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="vendor-search-input"
            type="text"
            placeholder="Search by contractor name, code, contact person, or contract reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="vendor-category-select"
              aria-label="Filter by Contractor Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All Categories</option>
              <option value="Civil & Hydraulic Infrastructure">Civil & Hydraulic</option>
              <option value="Drinking Water & Water Purification">Drinking Water</option>
              <option value="Sanitation & Bio-Toilets">Sanitation</option>
              <option value="Public Lighting & Solar Arrays">Public Lighting</option>
            </select>
          </div>

          <select
            id="vendor-status-select"
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Suspended">Suspended</option>
          </select>

          <Button variant="secondary" size="sm" onClick={fetchVendors}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Contractors Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium">Loading contractor registry...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">No contractors match the filter</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contractor & Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Contract Ref & Validity</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4 text-center">Assigned Works</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                  >
                    {/* Contractor & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                          {vendor.vendor_code.substring(0, 4)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-brand transition-colors">
                            {vendor.company_name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{vendor.vendor_code}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-700 font-medium px-2 py-0.5 bg-slate-100 rounded-md">
                        {vendor.category}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-900 font-medium">{vendor.contact_name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {vendor.email}
                        </span>
                        {vendor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {vendor.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contract Ref */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-mono font-medium text-slate-800">
                        {vendor.contract_reference || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {vendor.contract_end_date ? `Valid till ${vendor.contract_end_date}` : 'Ongoing'}
                      </div>
                    </td>

                    {/* Compliance */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {vendor.compliance_status === 'Compliant' && (
                          <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                            Compliant
                          </Badge>
                        )}
                        {vendor.compliance_status === 'Renewal Due' && (
                          <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                            Renewal Due
                          </Badge>
                        )}
                        {vendor.compliance_status === 'Suspended' && (
                          <Badge variant="error" size="sm">
                            Suspended
                          </Badge>
                        )}

                        {vendor.compliance_document_ref && (
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {vendor.compliance_document_ref}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assigned Works */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold bg-brand-light text-brand rounded-full">
                        {vendor.assigned_packages_count} packages
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vendors/${vendor.id}`);
                        }}
                      >
                        Portal
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Contractor Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Contractor"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-govError-light border border-govError-border rounded-lg text-xs text-govError font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contractor Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. VND-AP-05"
                value={formData.vendor_code}
                onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="Civil & Hydraulic Infrastructure">Civil & Hydraulic</option>
                <option value="Drinking Water & Water Purification">Drinking Water</option>
                <option value="Sanitation & Bio-Toilets">Sanitation</option>
                <option value="Public Lighting & Solar Arrays">Public Lighting</option>
                <option value="Safety & Crowd Control Barriers">Safety & Barricades</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Company / Entity Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Godavari Engineering Works Pvt Ltd"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                placeholder="Authorized representative name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="official@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 883 2460000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contract Reference</label>
              <input
                type="text"
                placeholder="e.g. CTR/2026/AP-PWD/112"
                value={formData.contract_reference}
                onChange={(e) => setFormData({ ...formData, contract_reference: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contract Validity Until</label>
              <input
                type="date"
                value={formData.contract_end_date}
                onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Compliance Document Ref</label>
              <input
                type="text"
                placeholder="ISO or Safety Cert ID"
                value={formData.compliance_document_ref}
                onChange={(e) => setFormData({ ...formData, compliance_document_ref: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={registering}>
              Register Contractor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
