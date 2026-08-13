const { pool } = require('../config/db');
const { ALL_CRITERIA_KEYS } = require('../config/evaluationCriteria');

// ─── SUBMIT EVALUATION (student) ────────────────────────────────────────────
const submitEvaluation = async (req, res) => {
  try {
    const {
      event_id,
      criteria_ratings,
      most_helpful,
      least_helpful,
      suggestions,
    } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

    if (!criteria_ratings || typeof criteria_ratings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Criteria ratings are required.',
      });
    }

    // Every criterion must have a 1-5 score.
    for (const key of ALL_CRITERIA_KEYS) {
      const score = Number(criteria_ratings[key]);

      if (!score || score < 1 || score > 5) {
        return res.status(400).json({
          success: false,
          message: `Please rate every item (missing: ${key}).`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CHECK IF EVENT HAS ENDED
    //
    // Event dates/times in the database are Philippine local time.
    // Aiven/MySQL may run using UTC, so compare the event's
    // Philippine end time against UTC + 8 hours.
    //
    // If time_end is NULL, the event ends at 11:59:59 PM.
    // ─────────────────────────────────────────────────────────────
    const [eventRows] = await pool.query(
      `SELECT
         date_end,
         time_end,
         (
           (UTC_TIMESTAMP() + INTERVAL 8 HOUR)
           >= TIMESTAMP(
                date_end,
                COALESCE(time_end, '23:59:59')
              )
         ) AS has_ended
       FROM events
       WHERE event_id = ?`,
      [event_id]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    if (!eventRows[0].has_ended) {
      return res.status(403).json({
        success: false,
        message: 'Evaluation opens once the event has ended.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CHECK STUDENT ATTENDED THIS EVENT
    // ─────────────────────────────────────────────────────────────
    const [attended] = await pool.query(
      `SELECT attendance_id
       FROM attendance
       WHERE user_id = ? AND event_id = ?`,
      [req.user.user_id, event_id]
    );

    if (attended.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only evaluate events you attended.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CHECK IF STUDENT ALREADY SUBMITTED AN EVALUATION
    // ─────────────────────────────────────────────────────────────
    const [existing] = await pool.query(
      `SELECT evaluation_id
       FROM evaluations
       WHERE user_id = ? AND event_id = ?`,
      [req.user.user_id, event_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an evaluation for this event.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CALCULATE OVERALL RATING
    // ─────────────────────────────────────────────────────────────
    const overallRating = Math.round(
      ALL_CRITERIA_KEYS.reduce(
        (sum, key) => sum + Number(criteria_ratings[key]),
        0
      ) / ALL_CRITERIA_KEYS.length
    );

    // ─────────────────────────────────────────────────────────────
    // SAVE EVALUATION + CRITERIA RATINGS
    // ─────────────────────────────────────────────────────────────
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO evaluations
          (
            user_id,
            event_id,
            rating,
            feedback,
            most_helpful,
            least_helpful,
            suggestions,
            submitted_at
          )
         VALUES (?, ?, ?, NULL, ?, ?, ?, NOW())`,
        [
          req.user.user_id,
          event_id,
          overallRating,
          most_helpful || null,
          least_helpful || null,
          suggestions || null,
        ]
      );

      const evaluationId = result.insertId;

      const rows = ALL_CRITERIA_KEYS.map((key) => [
        evaluationId,
        key,
        Number(criteria_ratings[key]),
      ]);

      await conn.query(
        `INSERT INTO evaluation_ratings
          (evaluation_id, criterion_key, score)
         VALUES ?`,
        [rows]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(201).json({
      success: true,
      message: 'Evaluation submitted. Thank you!',
    });
  } catch (error) {
    console.error('SubmitEvaluation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// ─── GET EVALUATIONS BY EVENT (admin / dept head) ───────────────────────────
const getEvaluationsByEvent = async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT
        ev.evaluation_id,
        ev.rating,
        ev.feedback,
        ev.most_helpful,
        ev.least_helpful,
        ev.suggestions,
        ev.submitted_at,
        u.first_name,
        u.last_name,
        u.year_level,
        u.block,
        d.department_name
      FROM evaluations ev
      JOIN users u ON ev.user_id = u.user_id
      LEFT JOIN departments d
        ON u.department_id = d.department_id
      WHERE ev.event_id = ?
    `;

    const params = [id];

    if (req.user.role === 'department_head') {
      query += ' AND u.department_id = ?';
      params.push(req.user.department_id);
    }

    query += ' ORDER BY ev.submitted_at DESC';

    const [evaluations] = await pool.query(query, params);

    const evalIds = evaluations.map((e) => e.evaluation_id);

    let criteriaAverages = [];

    if (evalIds.length > 0) {
      const [rows] = await pool.query(
        `SELECT
           criterion_key,
           AVG(score) AS weighted_mean
         FROM evaluation_ratings
         WHERE evaluation_id IN (?)
         GROUP BY criterion_key`,
        [evalIds]
      );

      criteriaAverages = rows.map((r) => ({
        criterion_key: r.criterion_key,
        weighted_mean: parseFloat(
          Number(r.weighted_mean).toFixed(2)
        ),
      }));
    }

    const avgRating =
      evaluations.length > 0
        ? (
            evaluations.reduce(
              (sum, e) => sum + e.rating,
              0
            ) / evaluations.length
          ).toFixed(2)
        : 0;

    return res.status(200).json({
      success: true,
      count: evaluations.length,
      avg_rating: parseFloat(avgRating),
      criteria_averages: criteriaAverages,
      evaluations,
    });
  } catch (error) {
    console.error('GetEvaluationsByEvent error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

// ─── GET MY EVALUATIONS (student) ───────────────────────────────────────────
const getMyEvaluations = async (req, res) => {
  try {
    const [evaluations] = await pool.query(
      `SELECT
         ev.evaluation_id,
         ev.event_id,
         ev.rating,
         ev.feedback,
         ev.most_helpful,
         ev.least_helpful,
         ev.suggestions,
         ev.submitted_at,
         e.event_name,
         e.date_start
       FROM evaluations ev
       JOIN events e
         ON ev.event_id = e.event_id
       WHERE ev.user_id = ?
       ORDER BY ev.submitted_at DESC`,
      [req.user.user_id]
    );

    return res.status(200).json({
      success: true,
      evaluations,
    });
  } catch (error) {
    console.error('GetMyEvaluations error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error.',
    });
  }
};

module.exports = {
  submitEvaluation,
  getEvaluationsByEvent,
  getMyEvaluations,
};