import React, { useState } from 'react';
import { ProductService, CampaignPromotionItem, PromotionTargetType } from '../../types';
import { Package, Wrench, Plus, Check, Trash2, Search, AlertCircle, Info } from 'lucide-react';

interface PromotionSelectorProps {
  promotingType: PromotionTargetType | '' | null;
  onChangePromotingType: (type: PromotionTargetType) => void;
  approvedCatalog: ProductService[];
  promotionItems: CampaignPromotionItem[];
  onChangePromotionItems: (items: CampaignPromotionItem[]) => void;
}

export const PromotionSelector: React.FC<PromotionSelectorProps> = ({
  promotingType,
  onChangePromotingType,
  approvedCatalog,
  promotionItems,
  onChangePromotionItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'Product' | 'Service'>('Product');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  const approvedProducts = approvedCatalog.filter((p) => p.type === 'Product' || !p.type);
  const approvedServices = approvedCatalog.filter((p) => p.type === 'Service');

  const filteredProducts = approvedProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = approvedServices.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (catalogId: string) => {
    return promotionItems.some((item) => item.originalCatalogId === catalogId);
  };

  const handleToggleCatalogItem = (item: ProductService) => {
    if (isSelected(item.id)) {
      onChangePromotionItems(
        promotionItems.filter((p) => p.originalCatalogId !== item.id)
      );
    } else {
      const newItem: CampaignPromotionItem = {
        id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: (item.type as 'Product' | 'Service') || 'Product',
        name: item.name,
        description: item.description,
        campaignProvided: false,
        approvedKnowledge: true,
        originalCatalogId: item.id,
      };
      onChangePromotionItems([...promotionItems, newItem]);
    }
  };

  const handleRemovePromotionItem = (id: string) => {
    onChangePromotionItems(promotionItems.filter((p) => p.id !== id));
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: CampaignPromotionItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: newItemType,
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      notesOrSpecs: newItemNotes.trim(),
      campaignProvided: true,
      approvedKnowledge: false,
    };

    onChangePromotionItems([...promotionItems, newItem]);
    setNewItemName('');
    setNewItemDescription('');
    setNewItemNotes('');
    setShowAddNewModal(false);
  };

  return (
    <div className="space-y-4" id="promotion-selector-container">
      {/* 1. What are you promoting? */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          What are you promoting? <span className="text-rose-500">*</span>
        </label>
        <div className="inline-flex rounded-xl border border-slate-200/90 p-1 bg-slate-50">
          {(['Product', 'Service', 'Both'] as PromotionTargetType[]).map((type) => (
            <button
              key={type}
              type="button"
              id={`promote-type-${type.toLowerCase()}`}
              onClick={() => {
                onChangePromotingType(type);
                if (type === 'Product') {
                  setNewItemType('Product');
                } else if (type === 'Service') {
                  setNewItemType('Service');
                }
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                promotingType === type
                  ? 'bg-white text-[#160857] shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {type === 'Product' && <Package className="w-3.5 h-3.5 inline mr-1.5 text-[#172DC3]" />}
              {type === 'Service' && <Wrench className="w-3.5 h-3.5 inline mr-1.5 text-[#6344BF]" />}
              {type === 'Both' && (
                <span className="inline-flex items-center gap-1 mr-1.5">
                  <Package className="w-3 h-3 text-[#172DC3]" />
                  <span className="text-[10px] text-slate-400">+</span>
                  <Wrench className="w-3 h-3 text-[#6344BF]" />
                </span>
              )}
              {type === 'Both' ? 'Products & Services' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Items summary chips */}
      {promotionItems.length > 0 && (
        <div className="rounded-xl bg-indigo-50/50 border border-indigo-100/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#160857]">
              Selected for this Campaign ({promotionItems.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {promotionItems.map((item) => (
              <span
                key={item.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
                  item.approvedKnowledge
                    ? 'bg-white text-[#160857] border-indigo-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                {item.type === 'Product' ? (
                  <Package className="w-3.5 h-3.5 text-[#172DC3]" />
                ) : (
                  <Wrench className="w-3.5 h-3.5 text-[#6344BF]" />
                )}
                <span>{item.name}</span>
                {item.approvedKnowledge ? (
                  <span className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-[#172DC3] border border-indigo-100 rounded-md font-bold">
                    Approved
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-100/70 text-amber-800 border border-amber-200 rounded-md font-bold">
                    Campaign-Only
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemovePromotionItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded-lg transition cursor-pointer"
                  title="Remove from campaign"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search and Add New Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-catalog-items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search approved products and services..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] text-slate-900 placeholder:text-slate-400 transition"
          />
        </div>
        <button
          type="button"
          id="btn-add-new-promo-item"
          onClick={() => {
            setNewItemType(promotingType === 'Service' ? 'Service' : 'Product');
            setShowAddNewModal(true);
          }}
          className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5 text-[#172DC3]" />
          <span>Add Custom {promotingType === 'Both' ? 'Item' : promotingType}</span>
        </button>
      </div>

      {/* Catalog Multi-Select Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1.5 border border-slate-200/80 rounded-xl bg-slate-50/50">
        {(promotingType === 'Product' || promotingType === 'Both') && (
          <div className={promotingType === 'Both' ? 'col-span-1' : 'col-span-2'}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Approved Products ({filteredProducts.length})
            </div>
            {filteredProducts.length === 0 ? (
              <div className="text-xs text-slate-400 italic p-3 bg-white rounded-xl border border-dashed border-slate-200 text-center">
                {searchTerm ? 'No matching approved products' : 'No approved products in catalog.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredProducts.map((prod) => {
                  const selected = isSelected(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleCatalogItem(prod)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selected
                          ? 'bg-indigo-50/70 border-[#172DC3] ring-1 ring-[#172DC3]/30 shadow-2xs'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-[#172DC3] border-[#172DC3] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {prod.name}
                        </div>
                        {prod.category && (
                          <div className="text-[10px] text-[#172DC3] font-bold mt-0.5">
                            {prod.category}
                          </div>
                        )}
                        {prod.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {prod.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(promotingType === 'Service' || promotingType === 'Both') && (
          <div className={promotingType === 'Both' ? 'col-span-1' : 'col-span-2'}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Approved Services ({filteredServices.length})
            </div>
            {filteredServices.length === 0 ? (
              <div className="text-xs text-slate-400 italic p-3 bg-white rounded-xl border border-dashed border-slate-200 text-center">
                {searchTerm ? 'No matching approved services' : 'No approved services in catalog.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredServices.map((svc) => {
                  const selected = isSelected(svc.id);
                  return (
                    <div
                      key={svc.id}
                      onClick={() => handleToggleCatalogItem(svc)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selected
                          ? 'bg-purple-50/70 border-[#6344BF] ring-1 ring-[#6344BF]/30 shadow-2xs'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-[#6344BF] border-[#6344BF] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {svc.name}
                        </div>
                        {svc.category && (
                          <div className="text-[10px] text-[#6344BF] font-bold mt-0.5">
                            {svc.category}
                          </div>
                        )}
                        {svc.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {svc.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Item Modal */}
      {showAddNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-md w-full p-6 animate-slide-in">
            <h3 className="text-base font-black text-[#15192B] mb-1">
              Add New Campaign-Specific Item
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Items added here are attached to this campaign draft. They are marked as{' '}
              <span className="font-bold text-amber-700">Campaign-Provided</span> and will not
              mutate your official company knowledge base.
            </p>

            <form onSubmit={handleAddNewItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewItemType('Product')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      newItemType === 'Product'
                        ? 'bg-indigo-50 border-[#172DC3] text-[#172DC3]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItemType('Service')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      newItemType === 'Service'
                        ? 'bg-purple-50 border-[#6344BF] text-[#6344BF]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Service
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter product or service name..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Describe the product or service offering..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Marketer Notes / Campaign Specs (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Add optional technical specs, dimensions, or campaign-specific notes..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNewModal(false)}
                  className="btn-secondary px-3.5 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs font-bold"
                >
                  Add to Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
