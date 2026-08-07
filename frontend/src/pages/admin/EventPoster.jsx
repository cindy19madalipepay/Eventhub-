import { useState, useEffect, useRef, useCallback, Component } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './EventPoster.css';

// ── Error Boundary ────────────────────────────────────────────
// Without this, any unexpected render error (bad data shape, a null
// field, a canvas failure) makes React unmount the page with NO visible
// message — just a blank white screen. This guarantees you always see
// something you can act on.
class PosterErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Always logged to console so DevTools > Console will show it
    console.error('EventPoster crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <DashboardLayout>
          <div className="poster-page">
            <div className="poster-error">
              <h2>⚠️ Something went wrong rendering the poster</h2>
              <p>{this.state.error?.message || 'Unknown error.'}</p>
              <Link to="/admin/events" className="btn-back">← Back to Events</Link>
            </div>
          </div>
        </DashboardLayout>
      );
    }
    return this.props.children;
  }
}

const EventPosterInner = () => {
  const { id } = useParams();
  const canvasRef = useRef(null);

  const [event, setEvent] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posterURL, setPosterURL] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [eventRes, qrRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/events/${id}/qr`),
        ]);

        // Log raw responses so Console always shows exactly what the
        // backend sent back — no more guessing from a blank screen.
        console.log('EventPoster: /events/:id response ->', eventRes.data);
        console.log('EventPoster: /events/:id/qr response ->', qrRes.data);

        if (!mounted) return;

        const eventData = eventRes.data?.event || eventRes.data;
        const qrData = qrRes.data?.qr_image || qrRes.data?.qr_code || qrRes.data;

        // Defensive check: if the backend didn't actually return usable
        // event data, fail loudly here instead of drawing a broken canvas.
        if (!eventData || typeof eventData !== 'object' || !eventData.event_name) {
          throw new Error(
            'Event data came back empty or in an unexpected shape. Check the /events/:id response in Network tab.'
          );
        }

        setEvent(eventData);
        setQrImage(typeof qrData === 'string' ? qrData : null);
      } catch (err) {
        console.error('EventPoster fetch error:', err);
        if (mounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load');
          toast.error('Failed to load event details.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!event || !canvasRef.current) return;
    drawPoster();
  }, [event, qrImage]);

  const drawPoster = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
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

      // Left accent
      ctx.fillStyle = '#0f3460';
      ctx.fillRect(0, 0, 6, H);

      // QR Section
      const qrSize = 180;
      const qrX = 32;
      const qrY = (H - qrSize) / 2;

      ctx.fillStyle = '#f8f9fa';
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      roundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.stroke();

      if (qrImage) {
        const qr = new Image();
        qr.crossOrigin = 'anonymous';

        qr.onload = () => {
          ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
          drawDetails(ctx, W, H);
          setPosterURL(canvas.toDataURL('image/png'));
        };

        qr.onerror = () => {
          console.warn('EventPoster: QR image failed to load, using placeholder. Source was:', qr.src);
          drawQRPlaceholder(ctx, qrX, qrY, qrSize);
          drawDetails(ctx, W, H);
          setPosterURL(canvas.toDataURL('image/png'));
        };

        const qrSrc = qrImage.startsWith('data:') || qrImage.startsWith('http')
          ? qrImage
          : `http://localhost:5000${qrImage.startsWith('/') ? '' : '/'}${qrImage}`;

        qr.src = qrSrc;
      } else {
        drawQRPlaceholder(ctx, qrX, qrY, qrSize);
        drawDetails(ctx, W, H);
        setPosterURL(canvas.toDataURL('image/png'));
      }

      // Scan hint
      ctx.fillStyle = '#0f3460';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to check in', qrX + qrSize / 2, qrY + qrSize + 28);

    } catch (err) {
      console.error('Draw error:', err);
      setError('Failed to generate poster: ' + err.message);
    }
  }, [event, qrImage]);

  const drawDetails = (ctx, W, H) => {
    const detailX = 250;
    const detailY = 45;

    ctx.fillStyle = '#0f3460';
    ctx.font = 'bold 22px sans-serif';
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
      ctx.font = '600 13px sans-serif';
      ctx.fillText(d.label, detailX, currentY);

      ctx.fillStyle = '#1a1a2e';
      ctx.font = '500 14px sans-serif';
      ctx.fillText(d.value, detailX + 75, currentY);

      currentY += lineHeight;
    });

    ctx.fillStyle = '#bbb';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by EventHub', W / 2, H - 14);
  };

  const drawQRPlaceholder = (ctx, x, y, size) => {
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR unavailable', x + size / 2, y + size / 2);
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

  const handleDownload = () => {
    if (!posterURL) {
      toast.error('Poster not ready');
      return;
    }
    const link = document.createElement('a');
    link.download = `${(event?.event_name || 'event').replace(/\s+/g, '_')}_Poster.png`;
    link.href = posterURL;
    link.click();
    toast.success('Poster downloaded!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="poster-page">
          <div className="poster-loading">⏳ Loading event details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="poster-page">
          <div className="poster-error">
            <h2>⚠️ Error</h2>
            <p>{error}</p>
            <Link to="/admin/events" className="btn-back">← Back to Events</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Guard: if we somehow got past loading/error with no event, show a
  // clear message instead of an empty canvas on a blank page.
  if (!event) {
    return (
      <DashboardLayout>
        <div className="poster-page">
          <div className="poster-error">
            <h2>⚠️ No event data</h2>
            <p>The event loaded but returned no usable data. Check the Console log for the raw response.</p>
            <Link to="/admin/events" className="btn-back">← Back to Events</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="poster-page">
        <div className="poster-header">
          <h1>🎫 Event Poster</h1>
          <p>{event.event_name}</p>
        </div>

        <div className="poster-card">
          <canvas
            ref={canvasRef}
            width={600}
            height={320}
            style={{ width: '600px', height: '320px', display: 'block' }}
          />
        </div>

        <div className="poster-actions">
          <button
            className="btn-download"
            onClick={handleDownload}
            disabled={!posterURL}
          >
            {posterURL ? '⬇️ Download Poster' : '⏳ Generating...'}
          </button>
          <Link to="/admin/events" className="btn-back">
            ← Back to Events
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

const EventPoster = () => (
  <PosterErrorBoundary>
    <EventPosterInner />
  </PosterErrorBoundary>
);

export default EventPoster;
