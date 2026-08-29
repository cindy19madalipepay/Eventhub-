import { useEffect, useRef, useState } from 'react';
// Bundling the worker from the installed package (via Vite's ?url import)
// guarantees the worker version always matches pdf.js itself, and serves it
// from our own domain instead of depending on a CDN having this exact
// version hosted.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Renders a PDF by drawing every page onto a <canvas> using pdf.js,
 * instead of relying on the browser's built-in PDF plugin (which desktop
 * Chrome/Edge have, but mobile in-app browsers like Messenger/Instagram
 * do NOT — that's why PDFs shown via <iframe> render as a blank white
 * box on those). Canvas rendering looks identical on every platform.
 */
const PdfViewer = ({ src }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const renderTasks = [];

    const render = async () => {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const pdf = await pdfjsLib.getDocument(src).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const containerWidth = container.clientWidth || 700;
          const unscaledViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '10px';
          canvas.style.borderRadius = '6px';
          container.appendChild(canvas);

          const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
          renderTasks.push(task);
          await task.promise;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error('PDF render failed:', err);
        if (!cancelled) {
          setError('Unable to display this PDF here.');
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      renderTasks.forEach((t) => t.cancel && t.cancel());
    };
  }, [src]);

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
      {loading && <div className="lightbox-pdf-loading">Loading PDF…</div>}
      {error && (
        <div className="lightbox-pdf-loading">
          {error}{' '}
          <a href={src} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
            Open PDF instead
          </a>
        </div>
      )}
      <div ref={containerRef} style={{ display: loading || error ? 'none' : 'block', padding: '8px' }} />
    </div>
  );
};

export default PdfViewer;