import multer from "multer";

// Memory storage for direct buffer uploads
export const memoryUpload = multer({ storage: multer.memoryStorage() });
