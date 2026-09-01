import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './PosterModal.css';

const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const PosterModal = ({ event, onClose }) => {
  const canvasRef = useRef(null);
  const [posterURL, setPosterURL] = useState(null);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    if (!event) return;
    drawPoster();
  }, [event]);

  const drawPoster = async () => {
    try {
      setGenerating(true);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Force a higher minimum export resolution regardless of screen DPI —
      // on displays where devicePixelRatio is 1, a 180px QR box was only
      // ever rendered at 180 physical pixels, which is too low-res for a
      // phone camera to lock onto reliably, especially once printed.
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const W = 600, H = 320;

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 0, 0, W, H, 16);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 0, 0, W, H, 16);
      ctx.stroke();

      // Left accent bar
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(0, 0, 6, H);

      // ── QR CODE ──
      let qrSrc = null;
      try {
        const qrRes = await api.get(`/events/${event.event_id}/qr`);
        const qrData = qrRes.data?.qr_image || qrRes.data?.qr_code || qrRes.data;
        qrSrc = qrData?.startsWith('data:') || qrData?.startsWith('http')
          ? qrData
          : `http://localhost:5000${qrData?.startsWith('/') ? '' : '/'}${qrData}`;
      } catch {
        // QR fetch failed
      }

      const qrSize = 180;
      const qrX = 32;
      const qrY = (H - qrSize) / 2;

      // QR card background
      ctx.fillStyle = '#f8f9fa';
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.stroke();

      if (qrSrc) {
        await loadAndDrawQR(ctx, qrSrc, qrX, qrY, qrSize);
      } else {
        drawQRPlaceholder(ctx, qrX, qrY, qrSize);
      }

      // Scan hint
      ctx.fillStyle = '#0f3460';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to check in', qrX + qrSize / 2, qrY + qrSize + 28);

      // ── DETAILS ──
      drawDetails(ctx, W, H);

      // Export
      const dataUrl = canvas.toDataURL('image/png');
      setPosterURL(dataUrl);
      setGenerating(false);

    } catch (err) {
      console.error('Poster draw error:', err);
      toast.error('Failed to generate poster');
      setGenerating(false);
    }
  };

  const loadAndDrawQR = (ctx, src, x, y, size) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Only disable smoothing when the source is SMALLER than the target
        // (upscaling) — nearest-neighbor keeps pixel edges crisp in that case.
        // When the source is LARGER than the target (downscaling), nearest-
        // neighbor instead randomly drops/merges pixels, which corrupts the
        // QR module grid — that mismatch, not smoothing itself, is what was
        // breaking phone scans.
        const isUpscaling = img.naturalWidth < size || img.naturalHeight < size;

        const prevSmoothing = ctx.imageSmoothingEnabled;
        const prevQuality = ctx.imageSmoothingQuality;

        if (isUpscaling) {
          ctx.imageSmoothingEnabled = false;
        } else {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }

        ctx.drawImage(img, x, y, size, size);

        ctx.imageSmoothingEnabled = prevSmoothing;
        ctx.imageSmoothingQuality = prevQuality;
        resolve();
      };
      img.onerror = () => {
        drawQRPlaceholder(ctx, x, y, size);
        resolve();
      };
      img.src = src;
    });
  };

  const drawQRPlaceholder = (ctx, x, y, size) => {
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR unavailable', x + size / 2, y + size / 2);
  };

  const drawDetails = (ctx, W, H) => {
    const detailX = 250;
    const detailY = 45;

    ctx.fillStyle = '#0f3460';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Event Details', detailX, detailY);

    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(detailX, detailY + 8);
    ctx.lineTo(detailX + 125, detailY + 8);
    ctx.stroke();

    const details = [
      { label: 'Event:', value: event?.event_name || '—' },
      { label: 'Date:', value: formatDate(event?.date_start) },
      { label: 'Time:', value: formatTimeRange(event?.time_start, event?.time_end) },
      { label: 'Venue:', value: event?.venue || 'TBA' },
      { label: 'Code:', value: event?.qr_code_data ? event.qr_code_data.slice(0, 10) + '...' : 'N/A' },
    ];

    let currentY = detailY + 48;
    const lineHeight = 44;

    details.forEach((d) => {
      ctx.fillStyle = '#888';
      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.fillText(d.label, detailX, currentY);

      ctx.fillStyle = '#1a1a2e';
      ctx.font = '500 14px -apple-system, sans-serif';
      ctx.fillText(d.value, detailX + 75, currentY);

      currentY += lineHeight;
    });

    ctx.fillStyle = '#bbb';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by EventHub', W / 2, H - 14);
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTimeRange = (start, end) => {
    const fmt = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    };
    if (!start) return '—';
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  };

  const handleDownload = async () => {
    if (!posterURL) return;

    const filename = `${(event?.event_name || 'event').replace(/\s+/g, '_')}_Poster.png`;

    try {
      // Convert the data: URL into an actual Blob/File.
      const res = await fetch(posterURL);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // Try the native "Save Image" / share sheet first — works on real
      // mobile Safari/Chrome outside of restrictive in-app webviews.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }

      // On mobile, if Web Share isn't available (common inside in-app
      // browsers like Messenger/Instagram), <a download> silently fails
      // there too — it doesn't throw an error, it just does nothing, which
      // previously caused us to falsely claim "Poster downloaded!". Instead
      // of guessing, point the user at the one thing that ALWAYS works on
      // any mobile browser: long-pressing the poster image itself (rendered
      // below as a real <img>, not just a canvas) to bring up "Save Image".
      if (isMobileDevice()) {
        toast('Long-press the poster image above, then tap "Save Image" to save it to your gallery.', {
          icon: '📷',
          duration: 6000,
        });
        return;
      }

      // Desktop: standard blob download, which is reliable here.
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Poster downloaded!');
    } catch (err) {
      // AbortError just means the user closed the native share sheet —
      // not a real failure, so don't show an error toast for that.
      if (err?.name !== 'AbortError') {
        console.error('Download failed:', err);
        toast.error('Download failed — try long-pressing the poster image to save it.');
      }
    }
  };

  const handlePrint = () => {
    if (!posterURL) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head><title>Print Poster</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
          <img src="${posterURL}" style="max-width:100%;height:auto;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  if (!event) return null;

  return (
    <div className="poster-modal-overlay" onClick={onClose}>
      <div className="poster-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="poster-modal-header">
          <h3> Event Poster</h3>
          <button className="poster-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="poster-preview-wrap">
          {generating && (
            <div className="poster-loading-overlay">
              <div className="poster-spinner" />
              <p>Generating poster...</p>
            </div>
          )}

          {/* Canvas does the actual drawing but stays hidden — the visible
              preview below is a real <img>, which is what lets mobile users
              long-press to save regardless of browser/webview restrictions. */}
          <canvas
            ref={canvasRef}
            width={600}
            height={320}
            style={{ display: 'none' }}
          />

          {posterURL && (
            <img
              src={posterURL}
              alt="Event poster"
              style={{ width: '600px', maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
            />
          )}
        </div>

        {posterURL && (
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', margin: '8px 0 0' }}>
            Tip: on mobile, you can also press and hold the poster above and choose "Save Image."
          </p>
        )}

        <div className="poster-modal-actions">
          <button className="btn-download" onClick={handleDownload} disabled={!posterURL}>
            Download PNG
          </button>
          <button className="btn-print" onClick={handlePrint} disabled={!posterURL}>
             Print
          </button>
          <button className="btn-close-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosterModal;