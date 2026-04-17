const { uploadMedia, IMAGE_TYPES } = require('../config/upload');

module.exports = function uploadHandler(req, res, next) {
  uploadMedia(req, res, (err) => {
    if (err) {
      err.statusCode = err.statusCode || 400;
      return next(err);
    }
    if (req.file) {
      const sub = IMAGE_TYPES.includes(req.file.mimetype) ? 'images' : 'videos';
      req.mediaUrl = `/uploads/${sub}/${req.file.filename}`;
      req.mediaType = IMAGE_TYPES.includes(req.file.mimetype) ? 'image' : 'video';
    } else {
      req.mediaUrl = '';
      req.mediaType = 'none';
    }
    next();
  });
};
