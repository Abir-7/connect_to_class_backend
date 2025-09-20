import path from "path";

export const get_relative_path = (file_path: string): string => {
  if (!file_path) {
    throw new Error("Path not found.");
  }

  const upload_dir = path.join(process.cwd(), "uploads"); // Root of the uploads folder
  const relative_path = path.relative(upload_dir, file_path); // Get the relative path from 'uploads'

  // Replace backslashes with forward slashes for uniformity and add a leading "/"
  return "/" + relative_path.replace(/\\/g, "/");
};
