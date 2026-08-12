const { pool } = require('../config/db');

// ─── UPLOAD PAYMENT PROOF (student) ─────────────────────────────────────────
const uploadPaymentProof = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment proof image is required.' });
    }

    if (!ticket_id) {
      return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
    }

    // Make sure this ticket belongs to this student
    const [tickets] = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = ? AND user_id = ?',
      [ticket_id, req.user.user_id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    if (tickets[0].payment_status === 'validated') {
      return res.status(409).json({ success: false, message: 'Payment already validated.' });
    }

    // req.file.path holds the actual hosted Cloudinary URL (set by
    // multer-storage-cloudinary) — NOT req.file.filename, which is just
    // Cloudinary's internal public_id, not a usable URL. Previously this
    // saved req.file.filename directly, which also assumed a local disk
    // path — but Vercel's serverless functions have no persistent local
    // storage, so that was never a valid path in production regardless.
    const proofUrl = req.file.path || req.file.secure_url || req.file.url || null;

    if (!proofUrl) {
      console.error('Cloudinary payment proof file information:', req.file);
      return res.status(500).json({
        success: false,
        message: 'Cloudinary did not return a valid image URL.',
      });
    }

    // Save file path and set status to pending
    await pool.query(
      "UPDATE tickets SET payment_proof = ?, payment_status = 'pending' WHERE ticket_id = ?",
      [proofUrl, ticket_id]
    );

    return res.status(200).json({
      success:  true,
      message:  'Payment proof uploaded. Waiting for admin validation.',
      proof_url: proofUrl,
    });

  } catch (error) {
    console.error('UploadPaymentProof error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET PAYMENTS BY STATUS (admin) ──────────────────────────────────────────
// Powers the Pending / Validated / Rejected tabs, plus their badge counts.
// GET /payments?status=pending|validated|rejected
const getPayments = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const validStatuses = ['pending', 'validated', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter.' });
    }

    const [payments] = await pool.query(
      `SELECT t.ticket_id, t.payment_proof, t.payment_status,
              t.created_at AS submitted_at,
              u.first_name, u.last_name, u.email, u.year_level, u.block,
              d.department_name,
              e.event_name, e.payment_amount
       FROM tickets t
       JOIN users u ON t.user_id = u.user_id
       JOIN events e ON t.event_id = e.event_id
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE t.payment_status = ?
       ORDER BY t.created_at DESC`,
      [status]
    );

    // Counts across all three tabs, regardless of which one is active,
    // so the tab badges always show the full picture.
    const [countRows] = await pool.query(
      `SELECT payment_status, COUNT(*) AS count
       FROM tickets
       WHERE payment_status IN ('pending', 'validated', 'rejected')
       GROUP BY payment_status`
    );

    const counts = { pending: 0, validated: 0, rejected: 0 };
    countRows.forEach((row) => {
      counts[row.payment_status] = row.count;
    });

    return res.status(200).json({ success: true, payments, counts });
  } catch (error) {
    console.error('GetPayments error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET PENDING PAYMENTS (admin) ────────────────────────────────────────────
// Kept for backward compatibility with anything still calling /payments/pending.
const getPendingPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT t.ticket_id, t.payment_proof, t.payment_status,
              t.created_at AS submitted_at,
              u.first_name, u.last_name, u.email, u.year_level, u.block,
              d.department_name,
              e.event_name, e.payment_amount
       FROM tickets t
       JOIN users u ON t.user_id = u.user_id
       JOIN events e ON t.event_id = e.event_id
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE t.payment_status = 'pending'
       ORDER BY t.created_at ASC`
    );

    return res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('GetPendingPayments error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── VALIDATE PAYMENT (admin) ────────────────────────────────────────────────
const validatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE tickets SET
        payment_status = 'validated',
        status = 'validated',
        validated_by = ?,
        validated_at = NOW()
       WHERE ticket_id = ?`,
      [req.user.user_id, id]
    );

    return res.status(200).json({ success: true, message: 'Payment validated. Ticket is now active.' });
  } catch (error) {
    console.error('ValidatePayment error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── REJECT PAYMENT (admin) ──────────────────────────────────────────────────
const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      "UPDATE tickets SET payment_status = 'rejected', status = 'pending' WHERE ticket_id = ?",
      [id]
    );

    return res.status(200).json({ success: true, message: 'Payment rejected.' });
  } catch (error) {
    console.error('RejectPayment error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET MY PAYMENTS (student) ───────────────────────────────────────────────
const getMyPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT t.ticket_id, t.payment_proof, t.payment_status,
              t.created_at AS submitted_at,
              e.event_name, e.payment_amount
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE t.user_id = ? AND e.requires_payment = 1
       ORDER BY t.created_at DESC`,
      [req.user.user_id]
    );

    // payment_proof is now a full Cloudinary URL (saved that way since the
    // uploadPaymentProof fix) — pass it through directly. Only fall back to
    // reconstructing the old local-path style for any records saved before
    // that switch (when only a bare filename was stored).
    const paymentsWithProofUrl = payments.map((p) => ({
      ...p,
      proof_url: p.payment_proof
        ? (p.payment_proof.startsWith('http')
            ? p.payment_proof
            : `/uploads/payments/${p.payment_proof}`)
        : null,
    }));

    return res.status(200).json({ success: true, payments: paymentsWithProofUrl });
  } catch (error) {
    console.error('GetMyPayments error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE MY PAYMENT RECEIPT (student) ─────────────────────────────────────
// Clears the uploaded proof and resets status to 'pending' so the student can
// re-upload. Blocked once an admin has already validated the payment.
const deleteMyPayment = async (req, res) => {
  try {
    const { id } = req.params; // ticket_id

    const [rows] = await pool.query(
      'SELECT * FROM tickets WHERE ticket_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (rows[0].payment_status === 'validated') {
      return res.status(403).json({ success: false, message: 'Cannot delete a validated payment.' });
    }

    await pool.query(
      "UPDATE tickets SET payment_proof = NULL, payment_status = 'pending' WHERE ticket_id = ?",
      [id]
    );

    return res.status(200).json({ success: true, message: 'Payment receipt deleted.' });
  } catch (error) {
    console.error('DeleteMyPayment error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  uploadPaymentProof,
  getPayments,
  getPendingPayments,
  validatePayment,
  rejectPayment,
  getMyPayments,
  deleteMyPayment,
};