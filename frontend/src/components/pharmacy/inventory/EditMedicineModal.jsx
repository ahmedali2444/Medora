import React, { useState } from 'react';
import { X, Loader2, ImagePlus, Trash2, Plus } from 'lucide-react';
import { medoraApi } from '../../../api/medoraApi';
import { useLocalizedContent } from '../../../hooks/useLocalizedContent';
import { localizedText } from '../../../utils/localization';
import { resolveImageUrl } from '../../../utils/professionalApiMappers';

export default function EditMedicineModal({ item, onClose, onSuccess }) {
  const { text } = useLocalizedContent();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState('');

  const initialImageUrl = item.imageUrl || '';
  const [details, setDetails] = useState({
    price: item.price?.toString() || '0',
    quantity: item.stock?.toString() || '0',
    reorderLevel: item.reorder?.toString() || '5',
    isAvailable: item.isAvailable ?? true,
    expiryDate: item.expiry ? item.expiry.split('T')[0] : '',
    batchNumber: item.batchNumber === '-' ? '' : (item.batchNumber || ''),
    imageUrl: initialImageUrl,
    batches: item.batches?.map(b => ({
      batchNumber: b.batchNumber || '',
      expiryDate: b.expiryDate ? b.expiryDate.split('T')[0] : '',
      quantity: b.quantity?.toString() || '0'
    })) || [],
  });

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      setDetails((prev) => ({ ...prev, imageUrl: res.url }));
    } catch (err) {
      setError(err.message || text(localizedText('فشل رفع الصورة', 'Failed to upload image')));
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        price: parseFloat(details.price),
        quantity: parseInt(details.quantity, 10),
        reorderLevel: parseInt(details.reorderLevel, 10) || 5,
        isAvailable: details.isAvailable,
        expiryDate: details.expiryDate || null,
        batchNumber: details.batchNumber || null,
        batches: details.batches.map(b => ({
          batchNumber: b.batchNumber || null,
          expiryDate: b.expiryDate || null,
          quantity: parseInt(b.quantity, 10) || 0
        }))
      };

      // Send the image only when it changed: a new upload, or '' to clear it
      if (details.imageUrl !== initialImageUrl) {
        payload.imageUrl = details.imageUrl;
      }

      await medoraApi.updatePharmacyMedicine(item.id, payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error updating medicine');
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-[#e4eeee] bg-slate-50 px-3 py-2 text-[12px] outline-none transition focus:border-[#14b8a6] focus:bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e4eeee] px-5 py-4">
          <h3 className="text-[14px] font-black text-[#084036]">
            {text(localizedText('تعديل الدواء', 'Edit Medicine'))}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="mb-4">
            <div className="text-[13px] font-bold text-[#084036]">{text(item.name)}</div>
            <div className="text-[11px] text-slate-500">{item.company}</div>
          </div>

          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={details.price}
                  onChange={(e) => setDetails({ ...details, price: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                  {text(localizedText('الكمية', 'Quantity'))} *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={details.quantity}
                  onChange={(e) => setDetails({ ...details, quantity: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                  {text(localizedText('تاريخ الصلاحية', 'Expiry Date'))}
                </label>
                <input
                  type="date"
                  value={details.expiryDate}
                  onChange={(e) => setDetails({ ...details, expiryDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                  {text(localizedText('رقم التشغيلة', 'Batch Number'))}
                </label>
                <input
                  type="text"
                  value={details.batchNumber}
                  onChange={(e) => setDetails({ ...details, batchNumber: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                  {text(localizedText('حد إعادة الطلب (للتنبيهات)', 'Reorder Level'))}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={details.reorderLevel}
                  onChange={(e) => setDetails({ ...details, reorderLevel: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Batches Section */}
            <div className="rounded-xl border border-[#e4eeee] bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#486466]">
                  {text(localizedText('التشغيلات (Batches)', 'Batches'))}
                </label>
                <button
                  type="button"
                  onClick={() => setDetails({
                    ...details,
                    batches: [...details.batches, { batchNumber: '', expiryDate: '', quantity: '0' }]
                  })}
                  className="flex items-center gap-1 rounded-lg bg-[#14b8a6] px-2 py-1 text-[10px] font-bold text-white transition hover:bg-[#0d9488]"
                >
                  <Plus size={12} />
                  {text(localizedText('إضافة تشغيلة', 'Add Batch'))}
                </button>
              </div>
              {details.batches.length === 0 ? (
                <div className="text-center text-[10px] text-slate-400">
                  {text(localizedText('لا توجد تشغيلات مضافة', 'No batches added'))}
                </div>
              ) : (
                <div className="space-y-2">
                  {details.batches.map((b, idx) => (
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
                              const newBatches = [...details.batches];
                              newBatches[idx].batchNumber = e.target.value;
                              setDetails({ ...details, batches: newBatches });
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
                              const newBatches = [...details.batches];
                              newBatches[idx].expiryDate = e.target.value;
                              setDetails({ ...details, batches: newBatches });
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
                              const newBatches = [...details.batches];
                              newBatches[idx].quantity = e.target.value;
                              setDetails({ ...details, batches: newBatches });
                            }}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newBatches = [...details.batches];
                          newBatches.splice(idx, 1);
                          setDetails({ ...details, batches: newBatches });
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

            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-[#486466]">
                {text(localizedText('صورة الدواء', 'Medicine Image'))}
              </label>
              {details.imageUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#e4eeee] bg-slate-50 p-2">
                  <img
                    src={resolveImageUrl(details.imageUrl, text(item.name))}
                    alt={text(item.name) || 'medicine'}
                    className="h-14 w-14 rounded-lg border border-[#e4eeee] bg-white object-contain"
                  />
                  <div className="min-w-0 flex-1 text-[11px] font-bold text-emerald-600">
                    {details.imageUrl === initialImageUrl
                      ? text(localizedText('الصورة الحالية', 'Current image'))
                      : text(localizedText('تم رفع صورة جديدة', 'New image uploaded'))}
                  </div>
                  <label
                    className={`cursor-pointer rounded-full p-1.5 text-slate-500 transition hover:bg-[#e6f7f7] hover:text-[#0e7c6e] ${imageUploading ? 'pointer-events-none opacity-60' : ''}`}
                    title={text(localizedText('تغيير الصورة', 'Change image'))}
                  >
                    {imageUploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className="hidden"
                      disabled={imageUploading}
                      onChange={handleImageSelect}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDetails({ ...details, imageUrl: '' })}
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

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={details.isAvailable}
                onChange={(e) => setDetails({ ...details, isAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-[#e4eeee] text-[#14b8a6] focus:ring-[#14b8a6]"
              />
              <label htmlFor="isAvailable" className="text-[12px] font-bold text-[#486466]">
                {text(localizedText('متاح للبيع', 'Available for sale'))}
              </label>
            </div>

            <div className="mt-6 flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-[12px] font-bold text-slate-600 transition hover:bg-slate-200"
              >
                {text(localizedText('إلغاء', 'Cancel'))}
              </button>
              <button
                type="submit"
                disabled={loading || imageUploading}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#14b8a6] py-3 text-[12px] font-bold text-white transition hover:bg-[#0e7c6e] disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {text(localizedText('حفظ التعديلات', 'Save Changes'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
