// ============================================================
// UPLOAD EVENT BANNER TO CLOUDINARY
// ============================================================
const uploadEventBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required.',
      });
    }

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
      `SELECT event_id, event_name, banner_image
       FROM events
       WHERE event_id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // --------------------------------------------------------
    // CloudinaryStorage already uploaded the image.
    // Get the URL returned by Cloudinary.
    // --------------------------------------------------------
    const bannerUrl =
      req.file.path ||
      req.file.secure_url ||
      req.file.url ||
      null;

    if (!bannerUrl) {
      console.error(
        'Cloudinary file information:',
        req.file
      );

      return res.status(500).json({
        success: false,
        message:
          'Cloudinary did not return a valid image URL.',
      });
    }

    // --------------------------------------------------------
    // Save Cloudinary URL in database
    // --------------------------------------------------------
    await pool.query(
      `UPDATE events
       SET banner_image = ?
       WHERE event_id = ?`,
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
    console.error(
      'UploadEventBanner error:',
      error
    );

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