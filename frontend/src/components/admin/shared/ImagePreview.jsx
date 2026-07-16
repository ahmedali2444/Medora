import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLang } from '../../../context/LanguageContext';

const ImagePreviewContext = createContext(null);

export function ImagePreviewProvider({ children }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const [preview, setPreview] = useState(null);
  const [scale, setScale] = useState(1);

  const closePreview = () => {
    setPreview(null);
    setScale(1);
  };

  useEffect(() => {
    if (!preview) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePreview();
      if (event.key === '+' || event.key === '=') setScale((current) => Math.min(current + 0.25, 3));
      if (event.key === '-') setScale((current) => Math.max(current - 0.25, 0.5));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [preview]);

  const value = useMemo(() => ({
    openPreview: (image) => {
      if (!image?.src) return;
      setPreview(image);
      setScale(1);
    },
  }), []);

  return (
    <ImagePreviewContext.Provider value={value}>
      {children}
      {preview && createPortal(
        <div
          data-image-preview-root
          className="fixed inset-0 z-[1000] flex flex-col bg-slate-950/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={isRtl ? 'معاينة الصورة' : 'Image preview'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <div className="flex min-h-16 items-center justify-center gap-3 border-b border-white/10 px-3 py-3 text-white sm:justify-between sm:px-4">
            <div className="hidden min-w-0 flex-1 truncate text-sm font-bold sm:block">{preview.alt || (isRtl ? 'معاينة الصورة' : 'Image preview')}</div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <PreviewControl label={isRtl ? 'تصغير' : 'Zoom out'} onClick={() => setScale((current) => Math.max(current - 0.25, 0.5))}>
                <ZoomOut size={18} />
              </PreviewControl>
              <span className="min-w-12 text-center text-xs font-bold">{Math.round(scale * 100)}%</span>
              <PreviewControl label={isRtl ? 'تكبير' : 'Zoom in'} onClick={() => setScale((current) => Math.min(current + 0.25, 3))}>
                <ZoomIn size={18} />
              </PreviewControl>
              <PreviewControl label={isRtl ? 'الحجم الأصلي' : 'Reset zoom'} onClick={() => setScale(1)}>
                <RotateCcw size={17} />
              </PreviewControl>
              <a
                href={preview.src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-10"
                aria-label={isRtl ? 'فتح الصورة الأصلية' : 'Open original image'}
                title={isRtl ? 'فتح الصورة الأصلية' : 'Open original image'}
              >
                <ExternalLink size={17} />
              </a>
              <PreviewControl label={isRtl ? 'إغلاق' : 'Close'} onClick={closePreview}>
                <X size={20} />
              </PreviewControl>
            </div>
          </div>

          <div
            className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePreview();
            }}
          >
            <img
              src={preview.src}
              alt={preview.alt || ''}
              className="max-h-[calc(100vh-8rem)] max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
            />
          </div>
        </div>,
        document.body,
      )}
    </ImagePreviewContext.Provider>
  );
}

export function PreviewableImage({ src, alt = '', className = '', onClick, onKeyDown, ...props }) {
  const previewContext = useContext(ImagePreviewContext);
  const { lang } = useLang();
  const label = lang === 'en' ? `Open ${alt || 'image'}` : `فتح ${alt || 'الصورة'}`;

  if (!src) return null;

  const open = (event) => {
    event.stopPropagation();
    onClick?.(event);
    previewContext?.openPreview({
      src: event.currentTarget.src || event.currentTarget.currentSrc || src,
      alt,
    });
  };

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      role="button"
      tabIndex={0}
      data-image-preview="false"
      aria-label={label}
      title={label}
      onClick={open}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        open(event);
      }}
      className={`${className} cursor-zoom-in outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-[#14b8a6]`}
    />
  );
}

function PreviewControl({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:h-10 sm:w-10"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
