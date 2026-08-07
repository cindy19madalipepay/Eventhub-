const express  = require('express');
const router   = express.Router();
const {
  uploadPaymentProof,
  getPayments,
  getPendingPayments,
  validatePayment,
  rejectPayment,
  getMyPayments,
  deleteMyPayment,
} = require('../controllers/paymentController');
const authMiddleware  = require('../middleware/authMiddleware');
const roleMiddleware  = require('../middleware/roleMiddleware');
const { upload }      = require('../middleware/uploadMiddleware');

router.post('/upload',          authMiddleware, upload.single('payment_proof'), uploadPaymentProof);

// Student's own payment history — must come before '/' and any '/:id' routes
router.get('/my',               authMiddleware, getMyPayments);

// Powers the Pending / Validated / Rejected tabs on the Receipts page
router.get('/',                 authMiddleware, roleMiddleware('admin'), getPayments);

// Kept for backward compatibility
router.get('/pending',          authMiddleware, roleMiddleware('admin'), getPendingPayments);

router.put('/:id/validate',     authMiddleware, roleMiddleware('admin'), validatePayment);
router.put('/:id/reject',       authMiddleware, roleMiddleware('admin'), rejectPayment);

// Student deletes their own (not-yet-validated) receipt
router.delete('/:id',           authMiddleware, deleteMyPayment);

module.exports = router;