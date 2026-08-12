const express          = require('express');
const router           = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware   = require('../middleware/authMiddleware');
const roleMiddleware   = require('../middleware/roleMiddleware');

// DEBUG: remove after you confirm deployment is working
router.all('/debug', (req, res) => {
  res.json({ ok: true, method: req.method, path: req.path, time: Date.now() });
});

router.post('/',         authMiddleware, ticketController.createTicket);
router.get('/my',        authMiddleware, ticketController.getMyTickets);
router.get('/event/:id', authMiddleware, roleMiddleware('admin', 'department_head'), ticketController.getTicketsByEvent);
router.put('/:id/block', authMiddleware, roleMiddleware('admin'), ticketController.blockTicket);

module.exports = router;