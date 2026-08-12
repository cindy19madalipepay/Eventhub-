import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './CreateEvent.css';

const CreateEvent = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    event_name: '',
    description: '',
    date_start: '',
    date_end: '',
    time_start: '',
    time_end: '',
    venue: '',
    requires_payment: false,
    payment_amount: '',
    department_ids: [],
    banner_url: '',
  });

  // ============================================================
  // RULES FILE
  // ============================================================

  const [rulesFile, setRulesFile] = useState(null);
  const [rulesPreview, setRulesPreview] = useState(null);

  // ============================================================
  // BANNER
  // ============================================================

  const [bannerMode, setBannerMode] = useState('upload');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // ============================================================
  // LIGHTBOX
  // ============================================================

  const [lightboxImage, setLightboxImage] = useState(null);

  // ============================================================
  // LOAD DEPARTMENTS
  // ============================================================

  useEffect(() => {
    setDepartments([
      {
        department_id: 1,
        department_name: 'BS Information Technology',
        department_code: 'BSIT',
      },
      {
        department_id: 2,
        department_name: 'BS Business Administration',
        department_code: 'BSBA',
      },
      {
        department_id: 3,
        department_name: 'BS Elementary Education',
        department_code: 'BEED',
      },
      {
        department_id: 4,
        department_name: 'BS Secondary Education',
        department_code: 'BSED',
      },
    ]);
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));
  };

  // ============================================================
  // RULES FILE
  // ============================================================

  const handleRulesFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        'Rules file must be under 10MB.'
      );
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        'Only PDF, JPG, and PNG files are allowed.'
      );
      return;
    }

    setRulesFile(file);

    const url = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
      setRulesPreview({
        type: 'image',
        url,
        name: file.name,
      });
    } else {
      setRulesPreview({
        type: 'pdf',
        url,
        name: file.name,
      });
    }
  };

  const removeRulesFile = () => {
    if (rulesPreview?.url) {
      URL.revokeObjectURL(rulesPreview.url);
    }

    setRulesFile(null);
    setRulesPreview(null);
  };

  // ============================================================
  // BANNER FILE
  // ============================================================

  const handleBannerFile = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(
        'Please choose an image file for the banner.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        'Banner image must be under 5MB.'
      );
      return;
    }

    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setBannerFile(file);
    setBannerPreview(previewUrl);
  };

  const removeBannerFile = () => {
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }

    setBannerFile(null);
    setBannerPreview(null);
  };

  // ============================================================
  // SWITCH BANNER MODE
  // ============================================================

  const switchBannerMode = (mode) => {
    setBannerMode(mode);

    if (mode === 'upload') {
      setForm((prev) => ({
        ...prev,
        banner_url: '',
      }));
    } else {
      removeBannerFile();
    }
  };

  // ============================================================
  // DEPARTMENT
  // ============================================================

  const toggleDepartment = (id) => {
    setForm((prev) => {
      const exists =
        prev.department_ids.includes(id);

      return {
        ...prev,
        department_ids: exists
          ? prev.department_ids.filter(
              (departmentId) =>
                departmentId !== id
            )
          : [
              ...prev.department_ids,
              id,
            ],
      };
    });
  };

  const selectAllDepartments = () => {
    setForm((prev) => ({
      ...prev,
      department_ids:
        departments.map(
          (department) =>
            department.department_id
        ),
    }));
  };

  // ============================================================
  // SUBMIT EVENT
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.event_name.trim() ||
      !form.date_start ||
      !form.time_start
    ) {
      toast.error(
        'Event name, date, and time are required.'
      );
      return;
    }

    if (form.department_ids.length === 0) {
      toast.error(
        'Select at least one department who can attend.'
      );
      return;
    }

    if (
      form.requires_payment &&
      (
        !form.payment_amount ||
        Number(form.payment_amount) <= 0
      )
    ) {
      toast.error(
        'Enter a valid payment amount.'
      );
      return;
    }

    if (
      bannerMode === 'link' &&
      form.banner_url &&
      !/^https?:\/\/.+/i.test(
        form.banner_url
      )
    ) {
      toast.error(
        'Please enter a valid banner URL.'
      );
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // STEP 1 — CREATE EVENT
      // ========================================================

      const payload = {
        event_name:
          form.event_name.trim(),

        description:
          form.description.trim(),

        date_start:
          form.date_start,

        date_end:
          form.date_end ||
          form.date_start,

        time_start:
          form.time_start,

        time_end:
          form.time_end ||
          form.time_start,

        venue:
          form.venue.trim(),

        requires_payment:
          Boolean(form.requires_payment),

        payment_amount:
          form.requires_payment
            ? Number(form.payment_amount)
            : 0,

        department_ids:
          form.department_ids,

        banner_url:
          bannerMode === 'link'
            ? form.banner_url.trim()
            : null,
      };

      const res = await api.post(
        '/events',
        payload
      );

      const eventId =
        res.data?.event_id ||
        res.data?.event?.event_id;

      if (!eventId) {
        throw new Error(
          'Event was created but no event ID was returned.'
        );
      }

      // ========================================================
      // STEP 2 — UPLOAD BANNER
      // Path and field name must match backend/routes/eventRoutes.js:
      //   router.post('/:id/banner', authenticate, uploadBanner.single('banner'), uploadEventBanner)
      // ========================================================

      if (
        bannerMode === 'upload' &&
        bannerFile
      ) {
        const bannerFormData =
          new FormData();

        bannerFormData.append(
          'banner',
          bannerFile
        );

        await api.post(
          `/events/${eventId}/banner`,
          bannerFormData
        );
      }

      // ========================================================
      // STEP 3 — UPLOAD RULES
      // Path and field name must match backend/routes/eventRoutes.js:
      //   router.post('/:id/rules', authenticate, uploadRules.single('rules'), uploadEventRules)
      // ========================================================

      if (rulesFile) {
        const rulesFormData =
          new FormData();

        rulesFormData.append(
          'rules',
          rulesFile
        );

        await api.post(
          `/events/${eventId}/rules`,
          rulesFormData
        );
      }

      // ========================================================
      // SUCCESS
      // ========================================================

      toast.success(
        'Event created successfully! 🎉'
      );

      navigate(
        `/admin/events/${eventId}/poster`
      );

    } catch (err) {
      console.error(
        'Create event error:',
        err
      );

      toast.error(
        err.response?.data?.message ||
        err.message ||
        'Failed to create event.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>
      <div className="page-header">
        <h2>Create New Event</h2>
        <p>
          Fill out the details below to publish
          a new event.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="create-event-form"
      >

        {/* ======================================================
            BASIC INFORMATION
        ====================================================== */}

        <div className="card">
          <h3 className="section-title">
            Basic Information
          </h3>

          <div className="form-group">
            <label>
              Event Name *
            </label>

            <input
              name="event_name"
              placeholder="e.g. Annual Sports Fest 2026"
              value={form.event_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Description
            </label>

            <textarea
              name="description"
              placeholder="Describe what this event is about..."
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>
              Venue
            </label>

            <input
              name="venue"
              placeholder="e.g. University Gymnasium"
              value={form.venue}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* ======================================================
            DATE & TIME
        ====================================================== */}

        <div className="card">
          <h3 className="section-title">
            Date & Time
          </h3>

          <div className="form-row">
            <div className="form-group">
              <label>
                Start Date *
              </label>

              <input
                type="date"
                name="date_start"
                value={form.date_start}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                End Date
              </label>

              <input
                type="date"
                name="date_end"
                value={form.date_end}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Start Time *
              </label>

              <input
                type="time"
                name="time_start"
                value={form.time_start}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                End Time
              </label>

              <input
                type="time"
                name="time_end"
                value={form.time_end}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ======================================================
            DEPARTMENTS
        ====================================================== */}

        <div className="card">
          <div className="section-header-row">
            <h3 className="section-title">
              Who Can Attend
            </h3>

            <button
              type="button"
              className="link-btn"
              onClick={
                selectAllDepartments
              }
            >
              Select All
            </button>
          </div>

          <div className="department-grid">
            {departments.map((department) => (
              <label
                key={
                  department.department_id
                }
                className={
                  `dept-checkbox ${
                    form.department_ids.includes(
                      department.department_id
                    )
                      ? 'checked'
                      : ''
                  }`
                }
              >
                <input
                  type="checkbox"
                  checked={
                    form.department_ids.includes(
                      department.department_id
                    )
                  }
                  onChange={() =>
                    toggleDepartment(
                      department.department_id
                    )
                  }
                />

                <span>
                  {
                    department.department_code
                  }
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ======================================================
            PAYMENT
        ====================================================== */}

        <div className="card">
          <h3 className="section-title">
            Payment
          </h3>

          <label className="toggle-row">
            <input
              type="checkbox"
              name="requires_payment"
              checked={
                form.requires_payment
              }
              onChange={handleChange}
            />

            <span>
              This event requires payment
            </span>
          </label>

          {form.requires_payment && (
            <div
              className="form-group"
              style={{
                marginTop: 14,
              }}
            >
              <label>
                Payment Amount (₱) *
              </label>

              <input
                type="number"
                name="payment_amount"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={
                  form.payment_amount
                }
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        {/* ======================================================
            EVENT BANNER
        ====================================================== */}

        <div className="card">
          <h3 className="section-title">
            Event Banner
          </h3>

          <p className="rules-hint">
            Add a banner image for this event —
            upload a file or paste a link.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              className={`link-btn ${
                bannerMode === 'upload'
                  ? 'active'
                  : ''
              }`}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border:
                  '1px solid #ddd',
                cursor: 'pointer',
                background:
                  bannerMode === 'upload'
                    ? '#1B0833'
                    : '#fff',
                color:
                  bannerMode === 'upload'
                    ? '#fff'
                    : '#1B0833',
              }}
              onClick={() =>
                switchBannerMode(
                  'upload'
                )
              }
            >
              Upload Image
            </button>

            <button
              type="button"
              className={`link-btn ${
                bannerMode === 'link'
                  ? 'active'
                  : ''
              }`}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border:
                  '1px solid #ddd',
                cursor: 'pointer',
                background:
                  bannerMode === 'link'
                    ? '#1B0833'
                    : '#fff',
                color:
                  bannerMode === 'link'
                    ? '#fff'
                    : '#1B0833',
              }}
              onClick={() =>
                switchBannerMode(
                  'link'
                )
              }
            >
              Paste Link
            </button>
          </div>

          {bannerMode === 'upload' ? (
            !bannerPreview ? (
              <label className="rules-upload-area">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={
                    handleBannerFile
                  }
                  style={{
                    display: 'none',
                  }}
                />

                <span className="rules-upload-icon">
                  🖼️
                </span>

                <span className="rules-upload-text">
                  Click to upload banner
                  image
                </span>

                <span className="rules-upload-hint">
                  JPG, PNG, GIF, or WEBP —
                  max 5MB
                </span>
              </label>
            ) : (
              <div
                className="thumb-preview"
                onClick={() =>
                  setLightboxImage(
                    bannerPreview
                  )
                }
                role="button"
                tabIndex={0}
                title="Click to view full size"
              >
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="thumb-img"
                />

                <button
                  type="button"
                  className="thumb-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBannerFile();
                  }}
                  aria-label="Remove banner image"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            )
          ) : (
            <div className="form-group">
              <label>
                Banner Image URL
              </label>

              <input
                type="url"
                name="banner_url"
                placeholder="https://example.com/banner.jpg"
                value={
                  form.banner_url
                }
                onChange={
                  handleChange
                }
              />

              {form.banner_url && (
                <div
                  className="thumb-preview"
                  style={{
                    marginTop: 12,
                  }}
                  onClick={() =>
                    setLightboxImage(
                      form.banner_url
                    )
                  }
                  role="button"
                  tabIndex={0}
                  title="Click to view full size"
                >
                  <img
                    src={
                      form.banner_url
                    }
                    alt="Banner preview"
                    className="thumb-img"
                    onError={(e) => {
                      e.currentTarget.closest(
                        '.thumb-preview'
                      ).style.display =
                        'none';
                    }}
                  />

                  <button
                    type="button"
                    className="thumb-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();

                      setForm((prev) => ({
                        ...prev,
                        banner_url: '',
                      }));
                    }}
                    aria-label="Clear banner link"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================
            RULES
        ====================================================== */}

        <div className="card">
          <h3 className="section-title">
            Rules & Regulations
          </h3>

          <p className="rules-hint">
            Upload a PDF or image file
            containing the rules for this
            event.
          </p>

          {!rulesPreview ? (
            <label className="rules-upload-area">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={
                  handleRulesFile
                }
                style={{
                  display: 'none',
                }}
              />

              <span className="rules-upload-icon">
                📎
              </span>

              <span className="rules-upload-text">
                Click to upload rules file
              </span>

              <span className="rules-upload-hint">
                PDF, JPG, or PNG —
                max 10MB
              </span>
            </label>
          ) : rulesPreview.type === 'image' ? (
            <div
              className="thumb-preview"
              onClick={() =>
                setLightboxImage(
                  rulesPreview.url
                )
              }
              role="button"
              tabIndex={0}
              title="Click to view full size"
            >
              <img
                src={
                  rulesPreview.url
                }
                alt="Rules preview"
                className="thumb-img"
              />

              <button
                type="button"
                className="thumb-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRulesFile();
                }}
                aria-label="Remove rules file"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className="thumb-preview thumb-preview-pdf"
              onClick={() =>
                window.open(
                  rulesPreview.url,
                  '_blank',
                  'noopener,noreferrer'
                )
              }
              role="button"
              tabIndex={0}
              title="Click to open PDF"
            >
              <span className="pdf-thumb-icon">
                📄
              </span>

              <span className="pdf-name">
                {rulesPreview.name}
              </span>

              <button
                type="button"
                className="thumb-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRulesFile();
                }}
                aria-label="Remove rules file"
                title="Remove"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ======================================================
            SUBMIT
        ====================================================== */}

        <button
          type="submit"
          className="btn-create-event"
          disabled={loading}
        >
          {loading
            ? 'Creating Event...'
            : 'Create Event'}
        </button>
      </form>

      {/* ========================================================
          LIGHTBOX
      ======================================================== */}

      {lightboxImage && (
        <div
          className="lightbox-overlay"
          onClick={() =>
            setLightboxImage(null)
          }
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() =>
              setLightboxImage(null)
            }
            aria-label="Close preview"
          >
            ✕
          </button>

          <img
            src={lightboxImage}
            alt="Full size preview"
            className="lightbox-img"
            onClick={(e) =>
              e.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
};

export default CreateEvent;