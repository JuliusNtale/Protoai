'use strict';
const path = require('path');
const fs = require('fs');
const { FacialImage } = require('../models');
const logger = require('../utils/logger');

async function getImage(req, res) {
  const { user_id } = req.params;

  if (isNaN(parseInt(user_id))) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'user_id must be a number' } });
  }

  try {
    const record = await FacialImage.findOne({ where: { student_id: user_id } });

    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No facial image found for this user' } });
    }

    // Resolve absolute path — image_path stored as relative to project root or absolute
    let imgPath = record.image_path;
    if (!path.isAbsolute(imgPath)) {
      imgPath = path.resolve(process.cwd(), imgPath);
    }

    if (!fs.existsSync(imgPath)) {
      logger.warn(`Image file missing on disk for user ${user_id}: ${imgPath}`);
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image file not found on disk' } });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(imgPath);
  } catch (err) {
    logger.error(`getImage error: ${err.message}`);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve image' } });
  }
}

module.exports = { getImage };
