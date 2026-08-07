import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import './PaymentValidation.css';

const TABS = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'validated', label: 'Validated', icon: '✅' },
  { key: 'rejected', label: 'Rejected', icon: '❌' },
];

const PaymentValidation = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [payments, setPayments] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, validated: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const VISIBLE_COUNT = 5;

  useEffect(() => {
    setExpanded(false); // collapse back to the short list whenever the tab changes
    fetchPayments(activeTab);
  }, [activeTab]);

  const fetchPayments = async (status) => {
    setLoading(true);
    try {
      const res = await api.get(`/payments?status=${status}`);
      setPayments(res.data.payments || []);
      setCounts(res.data.counts || { pending: 0, validated: 0, rejected: 0 });
    } catch (err) {
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
      fetchPayments(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve receipt.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (ticketId) => {
    setActioningId(ticketId);
    try {
      await api.put(`/payments/${ticketId}/reject`);
      toast.success('Receipt rejected.');
      fetchPayments(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject receipt.');
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
      <h3>No pending receipts</h3>
      <p>Student payment receipts awaiting validation will appear here</p>
    </div>
  );

  // ─── RECEIPT CARD ───────────────────────────────────────────
  const renderReceiptCard = (p) => (
    <div key={p.ticket_id} className="receipt-item-card">
      <div className="receipt-item-left">
        {p.payment_proof ? (
          <img
            src={`http://localhost:5000/uploads/payments/${p.payment_proof}`}
            alt="Receipt"
            className="receipt-item-thumb"
          />
        ) : (
          <div className="receipt-item-thumb-placeholder">📄</div>
        )}
        <div className="receipt-item-info">
          <h4 className="receipt-item-event">{p.event_name}</h4>
          <p className="receipt-item-student">
            {p.first_name} {p.last_name}
          </p>
          <div className="receipt-item-meta">
            <span>{p.department_name || '—'}</span>
            {p.year_level && (
              <span>Year {p.year_level}{p.block ? ` - Block ${p.block}` : ''}</span>
            )}
            <span>{formatDate(p.submitted_at)}</span>
          </div>
        </div>
      </div>
      <div className="receipt-item-right">
        <span className="receipt-item-amount">
          ₱{parseFloat(p.payment_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
          <span className="status-tag status-tag-approved">Approved</span>
        )}
        {activeTab === 'rejected' && (
          <span className="status-tag status-tag-rejected">Rejected</span>
        )}
      </div>
    </div>
  );

  const visiblePayments = expanded ? payments : payments.slice(0, VISIBLE_COUNT);
  const hiddenCount = payments.length - VISIBLE_COUNT;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        {/* Header with tabs */}
        <div className="receipts-header">
          <div className="receipts-title">
            <h1>Payment Receipt Validation</h1>
          </div>
          <div className="receipts-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className="tab-count">({counts[tab.key] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="receipts-content-card">
            <p className="loading-text">Loading receipts...</p>
          </div>
        ) : payments.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="receipts-list">
              {visiblePayments.map((p) => renderReceiptCard(p))}
            </div>

            {payments.length > VISIBLE_COUNT && (
              <button
                className="show-more-btn"
                onClick={() => setExpanded((prev) => !prev)}
              >
                <span>{expanded ? 'Show Less' : `Show More (${hiddenCount} more)`}</span>
                <span className={`show-more-caret ${expanded ? 'rotated' : ''}`}>⌄</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentValidation;