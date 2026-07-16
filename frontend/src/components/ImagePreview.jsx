import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

function isBrandImage(image) {
  const alt = image.getAttribute('alt')?.toLowerCase() || '';
  const source = image.getAttribute('src')?.toLowerCase() || '';

  return alt.includes('medora') || alt.includes('logo') || /\/logo(?:\.[a-z]+)?(?:[?#]|$)/i.test(source);
}

function isPreviewableImage(image) {
  if (!(image instanceof HTMLImageElement)) return false;
  if (image.closest('[data-image-preview-root]')) return false;
  if (image.closest('[data-image-preview="false"]')) return false;
  if (isBrandImage(image)) return false;

  return Boolean(image.currentSrc || image.src);
}

export default function ImagePreview() {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const closeButtonRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);

  const closePreview = useCallback(() => {
    setPreview(null);
    setZoom(1);
  }, []);

  const changeZoom = useCallback((amount) => {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + amount)));
  }, []);

  useEffect(() => {
    const markPreviewableImages = (root = document) => {
      const images = root instanceof HTMLImageElement
        ? [root]
        : root.querySelectorAll?.('img') || [];

      images.forEach((image) => {
        image.classList.toggle('medora-image-preview-trigger', isPreviewableImage(image));
      });
    };

    markPreviewableImages();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          markPreviewableImages(mutation.target);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) markPreviewableImages(node);
        });
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'alt', 'data-image-preview'],
    });

    const handleImageClick = (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const image = event.target.closest('img');
      if (!isPreviewableImage(image)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setZoom(1);
      setPreview({
        src: image.currentSrc || image.src,
        alt: image.alt || image.title || (isRtl ? 'معاينة الصورة' : 'Image preview'),
      });
    };

    document.addEventListener('click', handleImageClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleImageClick, true);
      document.querySelectorAll('.medora-image-preview-trigger').forEach((image) => {
        image.classList.remove('medora-image-preview-trigger');
      });
    };
  }, [isRtl]);

  useEffect(() => {
    if (!preview) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePreview();
      if (event.key === '+' || event.key === '=') changeZoom(ZOOM_STEP);
      if (event.key === '-') changeZoom(-ZOOM_STEP);
      if (event.key === '0') setZoom(1);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [changeZoom, closePreview, preview]);

  if (!preview) return null;

  const copy = isRtl
    ? {
        close: 'إغلاق المعاينة',
        openOriginal: 'فتح الصورة الأصلية',
        zoomIn: 'تكبير',
        zoomOut: 'تصغير',
        reset: 'الحجم الأصلي',
      }
    : {
        close: 'Close preview',
        openOriginal: 'Open original image',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        reset: 'Original size',
      };

  return createPortal(
    <div
      data-image-preview-root
      className="fixed inset-0 z-[100] flex flex-col bg-[#031b18]/90 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={preview.alt}
      dir={isRtl ? 'rtl' : 'ltr'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePreview();
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/25 p-2 text-white">
        <div className="min-w-0 px-2">
          <p className="truncate text-xs font-bold sm:text-sm">{preview.alt}</p>
          <p className="mt-0.5 text-[10px] text-white/60">{Math.round(zoom * 100)}%</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="image-preview-control"
            aria-label={copy.zoomOut}
            title={copy.zoomOut}
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="image-preview-control"
            aria-label={copy.reset}
            title={copy.reset}
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="image-preview-control"
            aria-label={copy.zoomIn}
            title={copy.zoomIn}
          >
            <ZoomIn size={18} />
          </button>
          <a
            href={preview.src}
            target="_blank"
            rel="noopener noreferrer"
            className="image-preview-control"
            aria-label={copy.openOriginal}
            title={copy.openOriginal}
          >
            <ExternalLink size={17} />
          </a>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePreview}
            className="image-preview-control bg-white text-[#084036] hover:bg-[#e6f7f7]"
            aria-label={copy.close}
            title={copy.close}
          >
            <X size={19} />
          </button>
        </div>
      </div>

      <div
        className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePreview();
        }}
      >
        <img
          src={preview.src}
          alt={preview.alt}
          className="max-h-full max-w-full select-none object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          draggable="false"
          onDoubleClick={() => setZoom((current) => (current === 1 ? 2 : 1))}
        />
      </div>
    </div>,
    document.body,
  );
}
