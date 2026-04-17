const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

function makeStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      const sub = IMAGE_TYPES.includes(file.mimetype) ? 'images' : 'videos';
      cb(null, path.join(__dirname, '..', 'uploads', sub));
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

function fileFilter(allowed) {
  return (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    const err = new Error('File type not allowed');
    err.statusCode = 400;
    cb(err);
  };
}

const uploadImage = multer({
  storage: makeStorage(),
  fileFilter: fileFilter(IMAGE_TYPES),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('media');

const uploadVideo = multer({
  storage: makeStorage(),
  fileFilter: fileFilter(VIDEO_TYPES),
  limits: { fileSize: 100 * 1024 * 1024 },
}).single('media');

const uploadMedia = multer({
  storage: makeStorage(),
  fileFilter: fileFilter(ALL_TYPES),
  limits: { fileSize: 100 * 1024 * 1024 },
}).single('media');

module.exports = { uploadImage, uploadVideo, uploadMedia, IMAGE_TYPES };
