// middleware/upload.middleware.js
// Simple multer local storage for images. Replace with S3 in production.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  // accept images and pdfs
  if (/image|pdf/.test(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

module.exports = upload;
