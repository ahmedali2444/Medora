import React, { useState } from 'react';
import { X, Search, ScanLine, Loader2, ImagePlus, Trash2, Plus } from 'lucide-react';
import { medoraApi } from '../../../api/medoraApi';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';
import { resolveImageUrl } from '../../../utils/professionalApiMappers';

export default function AddMedicineBarcodeModal({ onClose, onSuccess }) {
  const { text } = useLocalizedContent();
  const [step, setStep] = useState(1); // 1: Barcode, 2: Form
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [barcode, setBarcode] = useState('');
  const [medicineDetails, setMedicineDetails] = useState({
    name: '',
    activeIngredient: '',
    category: '',
    imageUrl: '',
  });
  const [inventoryDetails, setInventoryDetails] = useState({
    price: '',
    quantity: '1',
    batches: [],
  });
  const [isExisting, setIsExisting] = useState(false);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await medoraApi.lookupBarcode(barcode.trim());
      // Found! 
      setMedicineDetails({
        name: response.name || '',
        activeIngredient: response.activeIngredient || '',
        category: response.category || '',
        imageUrl: response.imageUrl || '',
      });
      setIsExisting(true);
      setStep(2);
    } catch (err) {
      if (err.status === 404) {
        // Not found, proceed to create new
        setIsExisting(false);
        setStep(2);
      } else {
        setError(err.message || 'Error looking up barcode');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(text(localizedText('يرجى اختيار ملف صورة صالح', 'Please select a valid image file')));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(text(localizedText('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'Image must be smaller than 5 MB')));
      return;
    }

    setImageUploading(true);
    setError('');
    try {
      const res = await medoraApi.uploadImage(file);
      setMedicineDetails((prev) => ({ ...prev, imageUrl: res.url }));
    } catch (err) {
      setError(err.message || text(localizedText('فشل رفع الصورة', 'Failed to upload image')));
    } finally {
      setImageUploading(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        barcode: barcode.trim(),
        price: parseFloat(inventoryDetails.price),
        quantity: parseInt(inventoryDetails.quantity, 10),
        batches: inventoryDetails.batches.map(b => ({
          batchNumber: b.batchNumber || null,
          expiryDate: b.expiryDate || null,
          quantity: parseInt(b.quantity, 10) || 0
        }))
      };

      if (!isExisting) {
        payload.name = medicineDetails.name;
        payload.activeIngredient = medicineDetails.activeIngredient;
        payload.category = medicineDetails.category;
      }

      // Per-pharmacy image (uploaded from device) — applies whether the medicine
      // is new or already in the catalog.
      if (medicineDetails.imageUrl) {
        payload.imageUrl = medicineDetails.imageUrl;
      }

      await medoraApi.addMedicineByBarcode(payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error saving medicine');
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-[#e4eeee] bg-slate-50 px-3 py-2 text-[12px] outline-none transition focus:border-[#14b8a6] focus:bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e4eeee] px-5 py-4">
          <div className="flex items-center gap-2 text-[#084036]">
            <ScanLine size={18} className="text-[#14b8a6]" />
            <h3 className="text-[14px] font-black">
              {text(localizedText('إضافة دواء جديد', 'Add New Medicine'))}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleBarcodeSubmit}>
              <div className="mb-6 flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e6f7f7] text-[#14b8a6]">
                  <ScanLine size={32} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#084036]">
                    {text(localizedText('أدخل الباركود الخاص بالدواء', 'Enter the medicine barcode'))}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {text(localizedText('سيقوم النظام بالبحث عنه في الكتالوج لمنع التكرار', 'The system will search the catalog to prevent duplicates'))}
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                  {text(localizedText('رقم الباركود', 'Barcode Number'))}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., 6223000000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !barcode.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14b8a6] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#0e7c6e] disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {text(localizedText('بحث ومتابعة', 'Search and Continue'))}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleFinalSubmit}>
              {isExisting ? (
                <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-2 text-[11px] font-bold text-emerald-600">
                    {text(localizedText('تم العثور على الدواء في الكتالوج!', 'Medicine found in catalog!'))}
                  </div>
                  <div className="text-[14px] font-black text-[#084036]">{medicineDetails.name}</div>
                  <div className="text-[11px] text-emerald-700">{medicineDetails.activeIngredient}</div>
                </div>
              ) : (
                <div className="mb-5 space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
                    {text(localizedText('هذا الدواء جديد! يرجى إدخال بياناته لإضافته للكتالوج العام.', 'This is a new medicine! Please enter its details to add it to the global catalog.'))}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                      {text(localizedText('اسم الدواء', 'Medicine Name'))} *
                    </label>
                    <input
                      type="text"
                      required
                      value={medicineDetails.name}
                      onChange={(e) => setMedicineDetails({ ...medicineDetails, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                        {text(localizedText('الفئة/التصنيف', 'Category'))}
                      </label>
                      <select
                        value={medicineDetails.category}
                        onChange={(e) => setMedicineDetails({ ...medicineDetails, category: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">{text(localizedText('اختر...', 'Select...'))}</option>
                        <option value="Painkillers">{text(localizedText('مسكنات', 'Painkillers'))}</option>
                        <option value="Antibiotics">{text(localizedText('مضادات حيوية', 'Antibiotics'))}</option>
                        <option value="Vitamins">{text(localizedText('فيتامينات', 'Vitamins'))}</option>
                        <option value="Cold & Flu">{text(localizedText('برد وأنفلونزا', 'Cold & Flu'))}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                        {text(localizedText('المادة الفعالة', 'Active Ingredient'))}
                      </label>
                      <input
                        type="text"
                        value={medicineDetails.activeIngredient}
                        onChange={(e) => setMedicineDetails({ ...medicineDetails, activeIngredient: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Price and Quantity (Always Required) */}
              <div className="mb-6 border-t border-[#e4eeee] pt-4">
                <h4 className="mb-3 text-[12px] font-bold text-[#084036]">
                  {text(localizedText('بيانات المخزون الخاص بك', 'Your Inventory Details'))}
                </h4>

                {/* Per-pharmacy medicine image (uploaded from device) */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                    {text(localizedText('صورة الدواء (اختياري)', 'Medicine Image (Optional)'))}
                  </label>
                  {medicineDetails.imageUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e4eeee] bg-slate-50 p-2">
                      <img
                        src={resolveImageUrl(medicineDetails.imageUrl, medicineDetails.name)}
                        alt={medicineDetails.name || 'medicine'}
                        className="h-14 w-14 rounded-lg border border-[#e4eeee] bg-white object-contain"
                      />
                      <div className="min-w-0 flex-1 text-[11px] font-bold text-emerald-600">
                        {text(localizedText('تم رفع الصورة', 'Image uploaded'))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMedicineDetails({ ...medicineDetails, imageUrl: '' })}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title={text(localizedText('حذف الصورة', 'Remove image'))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfe3e3] bg-slate-50 px-3 py-3 text-[12px] font-bold text-[#486466] transition hover:border-[#14b8a6] hover:bg-white ${imageUploading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      {imageUploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} className="text-[#14b8a6]" />}
                      {imageUploading
                        ? text(localizedText('جارٍ الرفع...', 'Uploading...'))
                        : text(localizedText('رفع صورة من الجهاز', 'Upload image from device'))}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        className="hidden"
                        disabled={imageUploading}
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                      {text(localizedText('السعر', 'Price'))} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={inventoryDetails.price}
                      onChange={(e) => setInventoryDetails({ ...inventoryDetails, price: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                      {text(localizedText('الكمية المتاحة', 'Available Quantity'))} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={inventoryDetails.quantity}
                      onChange={(e) => setInventoryDetails({ ...inventoryDetails, quantity: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Batches Section */}
                <div className="mt-3 rounded-xl border border-[#e4eeee] bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#486466]">
                      {text(localizedText('التشغيلات (Batches)', 'Batches'))}
                    </label>
                    <button
                      type="button"
                      onClick={() => setInventoryDetails({
                        ...inventoryDetails,
                        batches: [...inventoryDetails.batches, { batchNumber: '', expiryDate: '', quantity: '0' }]
                      })}
                      className="flex items-center gap-1 rounded-lg bg-[#14b8a6] px-2 py-1 text-[10px] font-bold text-white transition hover:bg-[#0d9488]"
                    >
                      <Plus size={12} />
                      {text(localizedText('إضافة تشغيلة', 'Add Batch'))}
                    </button>
                  </div>
                  {inventoryDetails.batches.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-400">
                      {text(localizedText('لا توجد تشغيلات مضافة', 'No batches added'))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inventoryDetails.batches.map((b, idx) => (
                        <div key={idx} className="flex items-start gap-2 rounded-lg bg-white p-2 shadow-sm border border-[#e4eeee]">
                          <div className="grid flex-1 grid-cols-3 gap-2">
                            <div>
                              <label className="mb-1 block text-[9px] font-bold text-slate-500">
                                {text(localizedText('رقم التشغيلة', 'Batch No.'))}
                              </label>
                              <input
                                type="text"
                                value={b.batchNumber}
                                onChange={(e) => {
                                  const newBatches = [...inventoryDetails.batches];
                                  newBatches[idx].batchNumber = e.target.value;
                                  setInventoryDetails({ ...inventoryDetails, batches: newBatches });
                                }}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[9px] font-bold text-slate-500">
                                {text(localizedText('تاريخ الصلاحية', 'Expiry'))}
                              </label>
                              <input
                                type="date"
                                value={b.expiryDate}
                                onChange={(e) => {
                                  const newBatches = [...inventoryDetails.batches];
                                  newBatches[idx].expiryDate = e.target.value;
                                  setInventoryDetails({ ...inventoryDetails, batches: newBatches });
                                }}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[9px] font-bold text-slate-500">
                                {text(localizedText('الكمية', 'Quantity'))} *
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={b.quantity}
                                onChange={(e) => {
                                  const newBatches = [...inventoryDetails.batches];
                                  newBatches[idx].quantity = e.target.value;
                                  setInventoryDetails({ ...inventoryDetails, batches: newBatches });
                                }}
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newBatches = [...inventoryDetails.batches];
                              newBatches.splice(idx, 1);
                              setInventoryDetails({ ...inventoryDetails, batches: newBatches });
                            }}
                            className="mt-4 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-[12px] font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  {text(localizedText('رجوع', 'Back'))}
                </button>
                <button
                  type="submit"
                  disabled={loading || imageUploading}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#14b8a6] py-3 text-[12px] font-bold text-white transition hover:bg-[#0e7c6e] disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {text(localizedText('حفظ الدواء في مخزني', 'Save Medicine to Inventory'))}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
