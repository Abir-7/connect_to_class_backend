import fs from "fs";
import path from "path";

const unlink_file = (file: string) => {
  const filePath = path.join("uploads", file);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default unlink_file;
