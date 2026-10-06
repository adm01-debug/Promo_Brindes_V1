import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { replaceBrokenProductImage } from '../lib/images';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [activeImage, setActiveImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const index = Math.min(activeImage, Math.max(0, images.length - 1));
  const currentImage = images[index] || '/images/product-placeholder.svg';
  const moveImage = useCallback((delta: number) => {
    setActiveImage((current) => (current + delta + images.length) % Math.max(1, images.length));
  }, [images.length]);

  useLayoutEffect(() => { setActiveImage(0); }, [images]);

  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    // Move apenas a faixa de miniaturas, sem puxar a rolagem da página.
    if (thumb.offsetLeft < strip.scrollLeft) strip.scrollLeft = thumb.offsetLeft;
    else if (thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = thumb.offsetLeft + thumb.offsetWidth - strip.clientWidth;
    }
  }, [index]);

  useEffect(() => {
    if (!zoomOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) setZoomOpen(false);
    };
    const handleDialogKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft') moveImage(-1);
      if (event.key === 'ArrowRight') moveImage(1);
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    dialog?.addEventListener('click', handleBackdropClick);
    dialog?.addEventListener('keydown', handleDialogKeyboard);
    closeRef.current?.focus();
    return () => {
      dialog?.removeEventListener('click', handleBackdropClick);
      dialog?.removeEventListener('keydown', handleDialogKeyboard);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [moveImage, zoomOpen]);

  return (
    <section className="product-gallery" aria-label={`Fotos de ${name}`}>
      <div className="product-gallery__main">
        <img src={currentImage} alt={name} width="760" height="760" fetchPriority="high" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
      </div>
      <div className="product-gallery__toolbar">
        <div className="product-gallery__navigation">
          {images.length > 1 && <button type="button" onClick={() => moveImage(-1)} aria-label="Foto anterior"><ChevronLeft size={19} /></button>}
          <span role="status" aria-live="polite" aria-atomic="true">Foto {index + 1} de {Math.max(1, images.length)}</span>
          {images.length > 1 && <button type="button" onClick={() => moveImage(1)} aria-label="Próxima foto"><ChevronRight size={19} /></button>}
        </div>
        <button className="product-gallery__zoom" type="button" onClick={() => setZoomOpen(true)} aria-label={`Ampliar foto de ${name}`}><Maximize2 size={17} /><span>Ampliar</span></button>
      </div>
      {images.length > 1 && <div ref={thumbsRef} className="product-gallery__thumbs" role="group" aria-label="Escolher foto">
        {images.map((image, imageIndex) => <button key={image} type="button" className={index === imageIndex ? 'is-active' : ''} onClick={() => setActiveImage(imageIndex)} aria-label={`Ver foto ${imageIndex + 1}`} aria-pressed={index === imageIndex}>
          <img src={image} alt="" width="100" height="100" loading="lazy" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
        </button>)}
      </div>}
      {zoomOpen && <dialog ref={dialogRef} className="product-image-dialog" aria-label={`Foto ampliada de ${name}`} onCancel={(event) => { event.preventDefault(); setZoomOpen(false); }}>
        <div className="product-image-dialog__content">
          <button ref={closeRef} className="product-image-dialog__close" type="button" onClick={() => setZoomOpen(false)} aria-label="Fechar foto ampliada"><X size={22} /></button>
          <img src={currentImage} alt={name} referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
          <div className="product-image-dialog__navigation">
            {images.length > 1 && <button type="button" onClick={() => moveImage(-1)} aria-label="Foto anterior"><ChevronLeft /></button>}
            <span role="status" aria-live="polite" aria-atomic="true">Foto {index + 1} de {Math.max(1, images.length)}</span>
            {images.length > 1 && <button type="button" onClick={() => moveImage(1)} aria-label="Próxima foto"><ChevronRight /></button>}
          </div>
        </div>
      </dialog>}
    </section>
  );
}
