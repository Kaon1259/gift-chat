// middlewares/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 업로드 폴더 보장
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

console.log(`uploadDir = ${uploadDir}`);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 저장 방식 설정
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {

    const original = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 2) 확장자/베이스 분리 후 정리
    const ext  = path.extname(original);
    const base = path.basename(original, ext).replace(/\s+/g, '_');
    const uniq = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${uniq}${ext}`);
  },
});

// 파일 타입 필터 (이미지만 허용)
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('허용되지 않은 파일 형식입니다.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = upload ;
