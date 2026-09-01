import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './PaymentValidation.css';

// Get the backend/server base URL from the existing API configuration.
// This works both locally and when EventHub is deployed.
const UPLOADS_BASE = api.defaults.baseURL.replace(/\/api\/?$/, '');

// Resolve payment receipt image URLs.
// - Full Cloudinary URLs are used directly.
// - Existing relative URLs are attached to the deployed backend.
// - Old bare filenames are handled using the previous uploads/payments path.
const resolveImageUrl = (url) => {
  if (!url) return null;

  // Already a complete URL, such as a Cloudinary URL.
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // Already an uploads path.
  if (url.startsWith('/uploads/')) {
    return `${UPLOADS_BASE}${url}`;
  }

  // Old records that may only contain the filename.
  return `${UPLOADS_BASE}/uploads/payments/${url}`;
};

const TABS = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'validated', label: 'Validated', icon: '✅' },
  { key: 'rejected', label: 'Rejected', icon: '❌' },
];

const PaymentValidation = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [payments, setPayments] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    validated: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  // Full-size receipt image currently shown in the viewer modal, or null.
  // Holds the resolved URL directly (not the raw payment_proof value) since
  // that's all the modal needs to render.
  const [viewingImage, setViewingImage] = useState(null);

  const VISIBLE_COUNT = 5;

  useEffect(() => {
    setExpanded(false);
    fetchPayments(activeTab);
  }, [activeTab]);

  const fetchPayments = async (status) => {
    setLoading(true);

    try {
      const res = await api.get(`/payments?status=${status}`);

      setPayments(res.data.payments || []);

      setCounts(
        res.data.counts || {
          pending: 0,
          validated: 0,
          rejected: 0,
        }
      );
    } catch (err) {
      console.error('Fetch payments error:', err);
      toast.error('Failed to load receipts.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (ticketId) => {
    setActioningId(ticketId);

    try {
      await api.put(`/payments/${ticketId}/validate`);

      toast.success('Receipt approved.');

      await fetchPayments(activeTab);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to approve receipt.'
      );
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (ticketId) => {
    setActioningId(ticketId);

    try {
      await api.put(`/payments/${ticketId}/reject`);

      toast.success('Receipt rejected.');

      await fetchPayments(activeTab);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to reject receipt.'
      );
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';

    return new Date(dateStr).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // ─── EMPTY STATE ────────────────────────────────────────────
  const renderEmptyState = () => (
    <div className="empty-card">
      <div className="empty-mailbox">📬</div>
      <h3>No pending stubs</h3>
      <p>
        Student stub  awaiting validation will appear here
      </p>
    </div>
  );

  // ─── RECEIPT CARD ───────────────────────────────────────────
  const renderReceiptCard = (p) => {
    const receiptImageUrl = resolveImageUrl(p.payment_proof);

    return (
      <div key={p.ticket_id} className="receipt-item-card">
        <div className="receipt-item-left">
          {receiptImageUrl ? (
            <button
              type="button"
              className="receipt-item-thumb-btn"
              onClick={() => setViewingImage(receiptImageUrl)}
              aria-label="View receipt photo"
            >
              <img
                src={receiptImageUrl}
                alt="Receipt"
                className="receipt-item-thumb"
              />
            </button>
          ) : (
            <div className="receipt-item-thumb-placeholder">
              📄
            </div>
          )}

          <div className="receipt-item-info">
            <h4 className="receipt-item-event">
              {p.event_name}
            </h4>

            <p className="receipt-item-student">
              {p.first_name} {p.last_name}
            </p>

            <div className="receipt-item-meta">
              <span>{p.department_name || '—'}</span>

              {p.year_level && (
                <span>
                  Year {p.year_level}
                  {p.block ? ` - Block ${p.block}` : ''}
                </span>
              )}

              <span>{formatDate(p.submitted_at)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-item-right">
          <span className="receipt-item-amount">
            ₱
            {parseFloat(p.payment_amount).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
            })}
          </span>

          {activeTab === 'pending' && (
            <div className="receipt-item-actions">
              <button
                className="btn-action btn-approve"
                disabled={actioningId === p.ticket_id}
                onClick={() => handleValidate(p.ticket_id)}
              >
                ✓ Approve
              </button>

              <button
                className="btn-action btn-reject"
                disabled={actioningId === p.ticket_id}
                onClick={() => handleReject(p.ticket_id)}
              >
                ✕ Reject
              </button>
            </div>
          )}

          {activeTab === 'validated' && (
            <span className="status-tag status-tag-approved">
              Approved
            </span>
          )}

          {activeTab === 'rejected' && (
            <span className="status-tag status-tag-rejected">
              Rejected
            </span>
          )}
        </div>
      </div>
    );
  };

  const visiblePayments = expanded
    ? payments
    : payments.slice(0, VISIBLE_COUNT);

  const hiddenCount = payments.length - VISIBLE_COUNT;

  return (
    <>
      {/* Header with tabs */}
      <div className="receipts-header">
        <div className="receipts-title">
          <h1>Stub Validation</h1>
        </div>

        <div className="receipts-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${
                activeTab === tab.key ? 'active' : ''
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>

              <span>{tab.label}</span>

              <span className="tab-count">
                ({counts[tab.key] || 0})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="receipts-content-card">
          <p className="loading-text">
            Loading receipts...
          </p>
        </div>
      ) : payments.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <div className="receipts-list">
            {visiblePayments.map((p) =>
              renderReceiptCard(p)
            )}
          </div>

          {payments.length > VISIBLE_COUNT && (
            <button
              className="show-more-btn"
              onClick={() =>
                setExpanded((prev) => !prev)
              }
            >
              <span>
                {expanded
                  ? 'Show Less'
                  : `Show More (${hiddenCount} more)`}
              </span>

              <span
                className={`show-more-caret ${
                  expanded ? 'rotated' : ''
                }`}
              >
                ⌄
              </span>
            </button>
          )}
        </>
      )}

      {/* Receipt photo viewer modal */}
      {viewingImage && (
        <div
          className="modal-overlay"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="modal-card receipt-photo-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setViewingImage(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <img
              src={viewingImage}
              alt="Receipt full view"
              className="detail-modal-image"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentValidation;