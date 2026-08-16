import { useState, useMemo } from 'react';
import type { Package, PackageCategory, PurchaseFrequency } from '../lib/types';
import { formatCurrency } from '../lib/format';

interface AdminPackagesTableProps {
  packages: Package[];
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
  onToggle: (pkg: Package, field: 'featured') => void;
  onAdd: () => void;
  loading?: boolean;
}

type AdminPackage = Package & { active?: boolean };

const CATEGORIES: PackageCategory[] = ['bingwa_data', 'sms', 'minutes', 'highlighted', 'tunukiwa'];
const FREQUENCIES: PurchaseFrequency[] = ['buy_once', 'buy_many'];

const categoryLabels: Record<string, string> = {
  bingwa_data: 'Bingwa Data',
  sms: 'SMS',
  minutes: 'Minutes',
  highlighted: 'Highlighted',
  tunukiwa: 'Tunukiwa',
};

const PAGE_SIZE = 10;

/**
 * Packages management table for the admin dashboard.
 * Supports add, edit, delete, and toggle featured/active status.
 */
export default function AdminPackagesTable({
  packages,
  onEdit,
  onDelete,
  onToggle,
  onAdd,
  loading,
}: AdminPackagesTableProps) {
  const [page, setPage] = useState(0);
  const [editingPkg, setEditingPkg] = useState<AdminPackage | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Package | null>(null);

  const pagePackages = useMemo(() => {
    const start = page * PAGE_SIZE;
    return packages.slice(start, start + PAGE_SIZE);
  }, [packages, page]);

  const totalPages = Math.ceil(packages.length / PAGE_SIZE);

  const handleSave = (pkg: AdminPackage) => {
    onEdit(pkg as Package);
    setEditingPkg(null);
  };

  const handleAddSave = (pkg: AdminPackage) => {
    onEdit(pkg as Package);
    setIsAdding(false);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          {packages.length} package{packages.length !== 1 ? 's' : ''} total
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl active:bg-brand-700 transition-colors no-select"
          style={{ minHeight: '44px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Package
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Price</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Validity</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Featured</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Frequency</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Loading packages...
                    </div>
                  </td>
                </tr>
              ) : pagePackages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No packages found.
                  </td>
                </tr>
              ) : (
                pagePackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{pkg.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {categoryLabels[pkg.category] || pkg.category}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {formatCurrency(pkg.price)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{pkg.validity}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onToggle(pkg, 'featured')}
                        className={`relative w-11 h-6 rounded-full transition-colors no-select ${pkg.featured ? 'bg-brand-500' : 'bg-gray-300'}`}
                        aria-label={`Toggle featured for ${pkg.name}`}
                        role="switch"
                        aria-checked={pkg.featured}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            pkg.featured ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {pkg.purchase_frequency}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingPkg(pkg)}
                          className="p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          aria-label={`Edit ${pkg.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(pkg)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${pkg.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-40 active:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-40 active:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingPkg && (
        <PackageEditModal
          pkg={editingPkg}
          onSave={handleSave}
          onCancel={() => setEditingPkg(null)}
        />
      )}

      {/* Add modal */}
      {isAdding && (
        <PackageEditModal
          pkg={null}
          onSave={handleAddSave}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Package?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.name}</span> ({formatCurrency(deleteConfirm.price)})?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-3 text-base font-semibold text-white bg-red-600 rounded-xl active:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Package Edit Modal =====

interface PackageEditModalProps {
  pkg: AdminPackage | null;
  onSave: (pkg: AdminPackage) => void;
  onCancel: () => void;
}

function PackageEditModal({ pkg, onSave, onCancel }: PackageEditModalProps) {
  const [name, setName] = useState(pkg?.name || '');
  const [category, setCategory] = useState<PackageCategory>(pkg?.category || 'bingwa_data');
  const [price, setPrice] = useState(pkg?.price?.toString() || '');
  const [description, setDescription] = useState(pkg?.description || '');
  const [validity, setValidity] = useState(pkg?.validity || '');
  const [purchaseFrequency, setPurchaseFrequency] = useState<PurchaseFrequency>(pkg?.purchase_frequency || 'buy_once');
  const [featured, setFeatured] = useState(pkg?.featured || false);
  const [startTime, setStartTime] = useState(pkg?.start_time || '');
  const [endTime, setEndTime] = useState(pkg?.end_time || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPkg: AdminPackage = {
      id: pkg?.id || `pkg-${Date.now()}`,
      name: name.trim(),
      category,
      price: parseInt(price, 10) || 0,
      description: description.trim(),
      validity: validity.trim(),
      purchase_frequency: purchaseFrequency,
      featured,
      badge: pkg?.badge || null,
      start_time: startTime || null,
      end_time: endTime || null,
    };
    onSave(savedPkg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full my-auto max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {pkg ? 'Edit Package' : 'Add New Package'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PackageCategory)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Price (KSh)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            />
          </div>

          {/* Validity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Validity</label>
            <input
              type="text"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              placeholder="e.g. 24 Hours, 7 Days"
              required
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            />
          </div>

          {/* Purchase Frequency */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Frequency</label>
            <select
              value={purchaseFrequency}
              onChange={(e) => setPurchaseFrequency(e.target.value as PurchaseFrequency)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFeatured(!featured)}
              className={`relative w-11 h-6 rounded-full transition-colors ${featured ? 'bg-brand-500' : 'bg-gray-300'}`}
              role="switch"
              aria-checked={featured}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${featured ? 'translate-x-5' : ''}`} />
            </button>
            <label className="text-sm font-semibold text-gray-700">Featured</label>
          </div>

          {/* Time restrictions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time (optional)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Time (optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-xl outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-base font-semibold text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-base font-semibold text-white bg-brand-600 rounded-xl active:bg-brand-700 transition-colors"
            >
              {pkg ? 'Save Changes' : 'Add Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
