// ─── GET EVENT QR CODE ───────────────────────────────────────────────────────
const getEventQR = async (req, res) => {
  try {
    const { id } = req.params;

    // IMPORTANT:
    // event_id must be selected because we use it to build
    // the public check-in URL.
    const [rows] = await pool.query(
      `SELECT event_id, qr_code_data, event_name
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    // Your deployed frontend URL.
    // IMPORTANT: Set FRONTEND_URL in your backend environment variables
    // to your actual Vercel frontend URL.
    const frontendURL =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    // This is the URL that will be encoded inside the QR code.
    //
    // Example:
    // https://your-eventhub.vercel.app/checkin/1
    //
    // Event 1 -> /checkin/1
    // Event 2 -> /checkin/2
    // Event 3 -> /checkin/3
    const eventLink =
      `${frontendURL.replace(/\/$/, '')}/checkin/${rows[0].event_id}`;

    // Generate QR code image.
    const qrDataURL = await QRCode.toDataURL(eventLink, {
      width: 400,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return res.status(200).json({
      success: true,
      event_id: rows[0].event_id,
      event_name: rows[0].event_name,
      qr_code_data: rows[0].qr_code_data,
      event_link: eventLink,
      qr_image: qrDataURL
    });

  } catch (error) {
    console.error('GetEventQR error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};