const { pool } = require('../config/db');
const crypto = require('crypto');

// ============================================================
// CREATE EVENT
// ============================================================
const createEvent = async (req, res) => {
  try {
    const {
      event_name,
      description,
      date_start,
      date_end,
      time_start,
      time_end,
      venue,
      requires_payment,
      payment_amount,
      department_ids,
      banner_url,
    } = req.body;

    // --------------------------------------------------------
    // Validate required fields
    // --------------------------------------------------------
    if (!event_name || !date_start || !time_start) {
      return res.status(400).json({
        success: false,
        message: 'Event name, date, and start time are required.',
      });
    }

    // --------------------------------------------------------
    // Validate departments
    // --------------------------------------------------------
    let departmentIds = department_ids;

    if (typeof departmentIds === 'string') {
      try {
        departmentIds = JSON.parse(departmentIds);
      } catch (error) {
        departmentIds = [];
      }
    }

    if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one department who can attend.',
      });
    }

    // Convert department IDs to numbers and remove duplicates
    departmentIds = [
      ...new Set(
        departmentIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    if (departmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department selection.',
      });
    }

    // --------------------------------------------------------
    // Payment
    // --------------------------------------------------------
    const requiresPayment =
      requires_payment === true ||
      requires_payment === 1 ||
      requires_payment === '1' ||
      requires_payment === 'true';

    const paymentAmount = requiresPayment
      ? Number(payment_amount || 0)
      : 0;

    if (requiresPayment && paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid payment amount.',
      });
    }

    // --------------------------------------------------------
    // Date defaults
    // --------------------------------------------------------
    const eventDateEnd = date_end || date_start;
    const eventTimeEnd = time_end || null;

    // --------------------------------------------------------
    // Banner URL
    // Only used when user chooses "Paste Link".
    // Uploaded banner is handled separately after event creation.
    // --------------------------------------------------------
    const bannerImage =
      banner_url && String(banner_url).trim()
        ? String(banner_url).trim()
        : null;

    // --------------------------------------------------------
    // Creator
    // The `events.created_by` column is required (NOT NULL, no default)
    // and comes from the logged-in admin's token, set by authMiddleware
    // as req.user.user_id — not from the request body.
    // --------------------------------------------------------
    const createdBy = req.user?.user_id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify the logged-in user creating this event.',
      });
    }

    // --------------------------------------------------------
    // QR code data
    // The `events.qr_code_data` column is also required (NOT NULL, no
    // default). It needs to be unique per event, so it's generated here
    // rather than left for the database to fill in.
    // --------------------------------------------------------
    const qrCodeData = crypto.randomUUID();

    // --------------------------------------------------------
    // Start transaction
    // --------------------------------------------------------
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ------------------------------------------------------
      // Create event
      // ------------------------------------------------------
      const [result] = await connection.query(
        `
        INSERT INTO events (
          event_name,
          description,
          date_start,
          date_end,
          time_start,
          time_end,
          venue,
          requires_payment,
          payment_amount,
          banner_image,
          created_by,
          qr_code_data,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          event_name.trim(),
          description || null,
          date_start,
          eventDateEnd,
          time_start,
          eventTimeEnd,
          venue || null,
          requiresPayment ? 1 : 0,
          paymentAmount,
          bannerImage,
          createdBy,
          qrCodeData,
          'published',
        ]
      );

      const eventId = result.insertId;

      // ------------------------------------------------------
      // Add departments
      // ------------------------------------------------------
      for (const departmentId of departmentIds) {
        await connection.query(
          `
          INSERT INTO event_departments (
            event_id,
            department_id
          )
          VALUES (?, ?)
          `,
          [eventId, departmentId]
        );
      }

      // ------------------------------------------------------
      // Create the notification students see on their
      // Notifications page. Without this, nothing ever tells
      // students a new event exists — the page would only ever
      // show whatever unrelated notification rows already
      // happened to be sitting in the table.
      // ------------------------------------------------------
      await connection.query(
        `
        INSERT INTO notifications (
          user_id,
          event_id,
          title,
          message,
          type,
          target_role,
          sent_by,
          sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          createdBy,
          eventId,
          event_name.trim(),
          `A new event "${event_name.trim()}" has been posted. Check it out!`,
          'new_event',
          'student',
          createdBy,
        ]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Event created successfully.',
        event_id: Number(eventId),
        event: {
          event_id: Number(eventId),
          event_name: event_name.trim(),
          description: description || null,
          date_start: date_start,
          date_end: eventDateEnd,
          time_start: time_start,
          time_end: eventTimeEnd,
          venue: venue || null,
          requires_payment: requiresPayment,
          payment_amount: paymentAmount,
          banner_image: bannerImage,
          department_ids: departmentIds,
          created_by: createdBy,
          qr_code_data: qrCodeData,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('CreateEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create event.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// UPLOAD EVENT BANNER TO CLOUDINARY
// ============================================================
const uploadEventBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate Event ID
    // --------------------------------------------------------
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // --------------------------------------------------------
    // Validate uploaded file
    // --------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required.',
      });
    }

    // --------------------------------------------------------
    // Check event
    // --------------------------------------------------------
    const [events] = await pool.query(
      `
      SELECT
        event_id,
        event_name,
        banner_image
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // Cloudinary URL
    // --------------------------------------------------------
    const bannerUrl =
      req.file.path ||
      req.file.secure_url ||
      req.file.url ||
      null;

    if (!bannerUrl) {
      console.error(
        'Cloudinary banner file information:',
        req.file
      );

      return res.status(500).json({
        success: false,
        message:
          'Cloudinary did not return a valid image URL.',
      });
    }

    // --------------------------------------------------------
    // Save URL
    // --------------------------------------------------------
    await pool.query(
      `
      UPDATE events
      SET banner_image = ?
      WHERE event_id = ?
      `,
      [bannerUrl, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event banner uploaded successfully.',
      event_id: Number(id),
      banner_image: bannerUrl,
      banner_url: bannerUrl,
    });
  } catch (error) {
    console.error('UploadEventBanner error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to upload event banner.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// UPLOAD EVENT RULES FILE
// ============================================================
const uploadEventRules = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate Event ID
    // --------------------------------------------------------
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // --------------------------------------------------------
    // Validate file
    // --------------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Rules file is required.',
      });
    }

    // --------------------------------------------------------
    // Check event
    // --------------------------------------------------------
    const [events] = await pool.query(
      `
      SELECT
        event_id,
        event_name
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // Cloudinary URL
    // --------------------------------------------------------
    const rulesUrl =
      req.file.path ||
      req.file.secure_url ||
      req.file.url ||
      null;

    if (!rulesUrl) {
      console.error(
        'Cloudinary rules file information:',
        req.file
      );

      return res.status(500).json({
        success: false,
        message:
          'Cloudinary did not return a valid rules file URL.',
      });
    }

    // --------------------------------------------------------
    // Save URL
    // --------------------------------------------------------
    await pool.query(
      `
      UPDATE events
      SET rules_file = ?
      WHERE event_id = ?
      `,
      [rulesUrl, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Event rules uploaded successfully.',
      event_id: Number(id),
      rules_file: rulesUrl,
      rules_url: rulesUrl,
    });
  } catch (error) {
    console.error('UploadEventRules error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to upload event rules.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET ALL EVENTS
// ============================================================
const getEvents = async (req, res) => {
  try {
    const [events] = await pool.query(
      `
      SELECT
        e.*,
        GROUP_CONCAT(
          DISTINCT ed.department_id
          ORDER BY ed.department_id
          SEPARATOR ','
        ) AS department_ids
      FROM events e
      LEFT JOIN event_departments ed
        ON e.event_id = ed.event_id
      GROUP BY e.event_id
      ORDER BY e.date_start ASC, e.time_start ASC
      `
    );

    const formattedEvents = events.map((event) => ({
      ...event,
      event_id: Number(event.event_id),
      requires_payment:
        Boolean(event.requires_payment),
      payment_amount:
        Number(event.payment_amount || 0),
      department_ids: event.department_ids
        ? event.department_ids
            .split(',')
            .map((id) => Number(id))
        : [],
    }));

    return res.status(200).json({
      success: true,
      events: formattedEvents,
    });
  } catch (error) {
    console.error('GetEvents error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve events.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET EVENT BY ID
// ============================================================
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [events] = await pool.query(
      `
      SELECT
        e.*
      FROM events e
      WHERE e.event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const event = events[0];

    const [departments] = await pool.query(
      `
      SELECT
        ed.department_id
      FROM event_departments ed
      WHERE ed.event_id = ?
      ORDER BY ed.department_id
      `,
      [id]
    );

    const formattedEvent = {
      ...event,
      event_id: Number(event.event_id),
      requires_payment:
        Boolean(event.requires_payment),
      payment_amount:
        Number(event.payment_amount || 0),
      department_ids: departments.map((d) =>
        Number(d.department_id)
      ),
    };

    return res.status(200).json({
      success: true,
      event: formattedEvent,
    });
  } catch (error) {
    console.error('GetEventById error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve event.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// UPDATE EVENT
// ============================================================
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    // --------------------------------------------------------
    // Check event
    // --------------------------------------------------------
    const [existingEvents] = await pool.query(
      `
      SELECT event_id
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (existingEvents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const {
      event_name,
      description,
      date_start,
      date_end,
      time_start,
      time_end,
      venue,
      requires_payment,
      payment_amount,
      department_ids,
      banner_url,
    } = req.body;

    // --------------------------------------------------------
    // Build update dynamically
    // --------------------------------------------------------
    const fields = [];
    const values = [];

    if (event_name !== undefined) {
      fields.push('event_name = ?');
      values.push(event_name);
    }

    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description || null);
    }

    if (date_start !== undefined) {
      fields.push('date_start = ?');
      values.push(date_start);
    }

    if (date_end !== undefined) {
      fields.push('date_end = ?');
      values.push(date_end || date_start || null);
    }

    if (time_start !== undefined) {
      fields.push('time_start = ?');
      values.push(time_start);
    }

    if (time_end !== undefined) {
      fields.push('time_end = ?');
      values.push(time_end || null);
    }

    if (venue !== undefined) {
      fields.push('venue = ?');
      values.push(venue || null);
    }

    if (requires_payment !== undefined) {
      const requiresPayment =
        requires_payment === true ||
        requires_payment === 1 ||
        requires_payment === '1' ||
        requires_payment === 'true';

      fields.push('requires_payment = ?');
      values.push(requiresPayment ? 1 : 0);

      fields.push('payment_amount = ?');

      const amount = requiresPayment
        ? Number(payment_amount || 0)
        : 0;

      values.push(amount);
    } else if (payment_amount !== undefined) {
      fields.push('payment_amount = ?');
      values.push(Number(payment_amount || 0));
    }

    if (banner_url !== undefined) {
      fields.push('banner_image = ?');
      values.push(banner_url || null);
    }

    // --------------------------------------------------------
    // Update event
    // --------------------------------------------------------
    if (fields.length > 0) {
      values.push(id);

      await pool.query(
        `
        UPDATE events
        SET ${fields.join(', ')}
        WHERE event_id = ?
        `,
        values
      );
    }

    // --------------------------------------------------------
    // Update departments if provided
    // --------------------------------------------------------
    if (department_ids !== undefined) {
      let departmentIds = department_ids;

      if (typeof departmentIds === 'string') {
        try {
          departmentIds = JSON.parse(departmentIds);
        } catch (error) {
          departmentIds = [];
        }
      }

      if (!Array.isArray(departmentIds)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department selection.',
        });
      }

      departmentIds = [
        ...new Set(
          departmentIds
            .map((departmentId) => Number(departmentId))
            .filter(
              (departmentId) =>
                Number.isInteger(departmentId) &&
                departmentId > 0
            )
        ),
      ];

      if (departmentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Select at least one department.',
        });
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `
          DELETE FROM event_departments
          WHERE event_id = ?
          `,
          [id]
        );

        for (const departmentId of departmentIds) {
          await connection.query(
            `
            INSERT INTO event_departments (
              event_id,
              department_id
            )
            VALUES (?, ?)
            `,
            [id, departmentId]
          );
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      event_id: Number(id),
    });
  } catch (error) {
    console.error('UpdateEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update event.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// DELETE EVENT
// ============================================================
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [events] = await pool.query(
      `
      SELECT event_id
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ------------------------------------------------------
      // Remove event departments first
      // ------------------------------------------------------
      await connection.query(
        `
        DELETE FROM event_departments
        WHERE event_id = ?
        `,
        [id]
      );

      // ------------------------------------------------------
      // Delete event
      // ------------------------------------------------------
      await connection.query(
        `
        DELETE FROM events
        WHERE event_id = ?
        `,
        [id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
      event_id: Number(id),
    });
  } catch (error) {
    console.error('DeleteEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete event.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET EVENT QR
// ============================================================
const QRCode = require('qrcode');

const getEventQR = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    const [events] = await pool.query(
      `
      SELECT
        event_id,
        event_name
      FROM events
      WHERE event_id = ?
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // Generate an actual QR code image (as a base64 data URL)
    // encoding the link to the public check-in page, which
    // decides where to route the scanner (login vs. My Events).
    // FRONTEND_URL must be set as an env var on the backend host
    // to your live Vercel frontend domain in production.
    // --------------------------------------------------------
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const checkinUrl = `${FRONTEND_URL}/checkin/${events[0].event_id}`;

    const qrImage = await QRCode.toDataURL(checkinUrl);

    return res.status(200).json({
      success: true,
      event_id: Number(events[0].event_id),
      event_name: events[0].event_name,
      qr_data: checkinUrl,
      qr_image: qrImage,
    });
  } catch (error) {
    console.error('GetEventQR error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve event QR information.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// EXPORT CONTROLLERS
// ============================================================
module.exports = {
  createEvent,
  uploadEventBanner,
  uploadEventRules,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventQR,
};