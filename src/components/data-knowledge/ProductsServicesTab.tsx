import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Edit2,
  FileText,
  Tag,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Upload,
  X,
  Check,
  Filter,
  Image as ImageIcon,
  FileCheck,
  Package,
  Wrench,
} from 'lucide-react';
import { ProductService, ProductMediaItem } from '../../types';

interface ProductsServicesTabProps {
  products?: ProductService[];
  onSaveProduct: (product: ProductService) => Promise<void>;
  onDeleteProduct?: (id: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const ProductsServicesTab: React.FC<ProductsServicesTabProps> = ({
  products = [],
  onSaveProduct,
  onDeleteProduct,
  onRefreshData,
}) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'pending' | 'products' | 'services' | 'archived'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductService | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductService | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formType, setFormType] = useState<'Product' | 'Service'>('Product');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Custom Prototyping');
  const [formDesc, setFormDesc] = useState('');
  const [formSpecs, setFormSpecs] = useState('');
  const [formMaterials, setFormMaterials] = useState('');
  const [formClaims, setFormClaims] = useState('');
  const [formAvoidClaims, setFormAvoidClaims] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'Approved' | 'Pending' | 'Archived'>('Approved');
  const [formImages, setFormImages] = useState<ProductMediaItem[]>([]);
  const [formDocs, setFormDocs] = useState<ProductMediaItem[]>([]);

  // Unique categories
  const categories = Array.from(new Set(safeProducts.map((p) => p.category).filter(Boolean)));

  // Filter products
  const filteredProducts = safeProducts.filter((p) => {
    // Search
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.technicalSpecs && p.technicalSpecs.toLowerCase().includes(q)) ||
      (p.materials && p.materials.some((m) => m.toLowerCase().includes(q))) ||
      (p.category && p.category.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

    // Status / Type tab filter
    const status = p.approvalStatus || 'Approved'; // default legacy items to Approved
    if (activeFilter === 'approved') return status === 'Approved';
    if (activeFilter === 'pending') return status === 'Pending';
    if (activeFilter === 'archived') return status === 'Archived';
    if (activeFilter === 'products') return p.type !== 'Service' && status !== 'Archived';
    if (activeFilter === 'services') return p.type === 'Service' && status !== 'Archived';
    return status !== 'Archived'; // 'all' excludes archived unless archived tab clicked
  });

  const pendingCount = safeProducts.filter((p) => p.approvalStatus === 'Pending').length;
  const approvedCount = safeProducts.filter((p) => (p.approvalStatus || 'Approved') === 'Approved').length;
  const productsCount = safeProducts.filter((p) => p.type !== 'Service' && p.approvalStatus !== 'Archived').length;
  const servicesCount = safeProducts.filter((p) => p.type === 'Service' && p.approvalStatus !== 'Archived').length;

  const handleOpenAddModal = (type: 'Product' | 'Service' = 'Product') => {
    setEditingProduct(null);
    setFormType(type);
    setFormName('');
    setFormCategory('Custom Prototyping');
    setFormDesc('');
    setFormSpecs('');
    setFormMaterials('');
    setFormClaims('');
    setFormAvoidClaims('');
    setFormNotes('');
    setFormStatus('Approved');
    setFormImages([]);
    setFormDocs([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ProductService) => {
    setEditingProduct(p);
    setFormType(p.type || 'Product');
    setFormName(p.name);
    setFormCategory(p.category || 'General');
    setFormDesc(p.description);
    setFormSpecs(p.technicalSpecs || '');
    setFormMaterials((p.materials || []).join(', '));
    setFormClaims((p.approvedClaims || []).join('\n'));
    setFormAvoidClaims((p.claimsToAvoid || []).join('\n'));
    setFormNotes(p.additionalNotes || '');
    setFormStatus(p.approvalStatus || 'Approved');
    setFormImages(p.images || []);
    setFormDocs(p.referenceDocs || []);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setFormImages((prev) => [
          ...prev,
          {
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'image',
            name: file.name,
            url: dataUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setFormDocs((prev) => [
          ...prev,
          {
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: 'document',
            name: file.name,
            url: dataUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const itemToSave: ProductService = {
        id: editingProduct?.id || `prod_${Date.now()}`,
        type: formType,
        name: formName.trim(),
        category: formCategory.trim() || 'General',
        description: formDesc.trim(),
        technicalSpecs: formSpecs.trim() || undefined,
        materials: formMaterials
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
        approvedClaims: formClaims
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean),
        claimsToAvoid: formAvoidClaims
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean),
        additionalNotes: formNotes.trim() || undefined,
        approvalStatus: formStatus,
        images: formImages,
        referenceDocs: formDocs,
        imageUrl: formImages[0]?.url || editingProduct?.imageUrl,
        originatingCampaignId: editingProduct?.originatingCampaignId,
        originatingCampaignName: editingProduct?.originatingCampaignName,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveProduct(itemToSave);
      setIsModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to save product/service:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromoteToApproved = async (product: ProductService) => {
    const updated: ProductService = {
      ...product,
      approvalStatus: 'Approved',
      updatedAt: new Date().toISOString(),
    };
    await onSaveProduct(updated);
    if (onRefreshData) await onRefreshData();
  };

  const handleArchiveProduct = async (product: ProductService) => {
    const updated: ProductService = {
      ...product,
      approvalStatus: 'Archived',
      updatedAt: new Date().toISOString(),
    };
    await onSaveProduct(updated);
    if (onRefreshData) await onRefreshData();
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !onDeleteProduct) return;
    await onDeleteProduct(productToDelete.id);
    setProductToDelete(null);
    if (onRefreshData) await onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-[#A90CBF]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-[#15192B] text-base">3D Products & Services Catalog</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Authoritative company catalog of verified 3D fabrication capabilities, specifications, materials, and campaign promotions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAddModal('Product')}
              className="btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
            <button
              onClick={() => handleOpenAddModal('Service')}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#6344BF] border border-purple-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeFilter === 'all' ? 'bg-[#160857] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Catalog</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {products.filter((p) => p.approvalStatus !== 'Archived').length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeFilter === 'approved' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approved Knowledge</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {approvedCount}
              </span>
            </button>

            {pendingCount > 0 && (
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeFilter === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Review</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${activeFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-950 font-black'}`}>
                  {pendingCount}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveFilter('products')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeFilter === 'products' ? 'bg-[#172DC3] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Products ({productsCount})</span>
            </button>

            <button
              onClick={() => setActiveFilter('services')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeFilter === 'services' ? 'bg-[#6344BF] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Services ({servicesCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid / List */}
      {filteredProducts.length === 0 ? (
        <div className="card-tier-1 p-12 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-[#15192B] text-sm">No items found matching your criteria</p>
            <p className="text-xs text-slate-500">
              Add your first 3D product or service capability to build verified company grounding.
            </p>
          </div>
          <button
            onClick={() => handleOpenAddModal('Product')}
            className="btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const isPending = p.approvalStatus === 'Pending';
            const isApproved = (p.approvalStatus || 'Approved') === 'Approved';
            const isService = p.type === 'Service';

            return (
              <div
                key={p.id}
                className={`card-tier-1 p-5 rounded-2xl flex flex-col justify-between space-y-4 border transition-all ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Type, Category & Status Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                          isService ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isService ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        <span>{p.type || 'Product'}</span>
                      </span>

                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.category}
                      </span>
                    </div>

                    <div>
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Approved Knowledge</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="font-black text-[#15192B] text-base group-hover:text-indigo-600 transition">
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Originating Campaign Notice if pending */}
                  {isPending && p.originatingCampaignName && (
                    <div className="p-2.5 bg-amber-100/60 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                      <span>Created during campaign: <strong>{p.originatingCampaignName}</strong></span>
                    </div>
                  )}

                  {/* Materials Chips */}
                  {p.materials && p.materials.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Materials</span>
                      <div className="flex flex-wrap gap-1">
                        {p.materials.map((mat, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Specs */}
                  {p.technicalSpecs && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 leading-normal">
                      <strong className="text-slate-900 block mb-0.5 font-bold">Specs:</strong>
                      {p.technicalSpecs}
                    </div>
                  )}

                  {/* Approved Claims */}
                  {p.approvedClaims && p.approvedClaims.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Verified Claims ({p.approvedClaims.length})</span>
                      </span>
                      <ul className="text-[11px] text-slate-700 space-y-0.5 pl-1">
                        {p.approvedClaims.slice(0, 2).map((c, idx) => (
                          <li key={idx} className="line-clamp-1">
                            • {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Attached Images preview */}
                  {p.images && p.images.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {p.images.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt={img.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          title={img.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {isPending && (
                      <button
                        onClick={() => handlePromoteToApproved(p)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                        title="Promote to Verified Knowledge"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchiveProduct(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onDeleteProduct && (
                    <button
                      onClick={() => setProductToDelete(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-[#6344BF]">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="font-black text-[#15192B] text-base">
                  {editingProduct ? `Edit ${formType}` : `Add New ${formType}`}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Classification:</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setFormType('Product')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      formType === 'Product' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Physical Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Service')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      formType === 'Service' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Fabrication Service
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Approved">Approved Knowledge</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formType} Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. SLA Tough Resin Prototyping"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Rapid Prototyping, Corporate Gifts"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Approved Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approved Description & Capability Overview *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Accurate description of dimensions, capabilities, precision limits, and value proposition..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Specs & Materials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Technical Specifications (Tolerances, Volume)
                  </label>
                  <input
                    type="text"
                    value={formSpecs}
                    onChange={(e) => setFormSpecs(e.target.value)}
                    placeholder="e.g. Build vol: 300x300x400mm, Layer height: 50 microns"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supported Materials (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formMaterials}
                    onChange={(e) => setFormMaterials(e.target.value)}
                    placeholder="PLA+, PETG, SLA Tough Resin, TPU, ABS"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Approved Claims vs Avoid Claims */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Approved Claims (One per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formClaims}
                    onChange={(e) => setFormClaims(e.target.value)}
                    placeholder="e.g. 24h local turnaround&#10;Functional mechanical testing grade"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 text-xs bg-emerald-50/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    Details / Claims to Avoid (One per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formAvoidClaims}
                    onChange={(e) => setFormAvoidClaims(e.target.value)}
                    placeholder="e.g. Do not claim waterproof without coating"
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs bg-rose-50/30"
                  />
                </div>
              </div>

              {/* Image Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Reference Images & Mockups</label>
                  <label className="text-xs text-[#172DC3] hover:underline font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Images</span>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {formImages.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-2">
                    {formImages.map((img) => (
                      <div key={img.id} className="relative group shrink-0">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setFormImages(formImages.filter((i) => i.id !== img.id))}
                          className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 shadow-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim()}
                  className="btn-primary px-5 py-2 text-xs font-bold shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingProduct ? 'Update Catalog Item' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Delete Catalog Item</h4>
                <p className="text-xs text-slate-500">Remove from authoritative knowledge</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{productToDelete.name}</strong>? This will remove it from the catalog.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
