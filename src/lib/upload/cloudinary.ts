import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFileToCloudinary(
  file: File,
  folder: string
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `teaching-factory/${folder}` },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload ke Cloudinary gagal tanpa detail error"));
          return;
        }
        resolve(result as { secure_url: string });
      }
    );
    uploadStream.end(buffer);
  });

  return result.secure_url;
}


export async function uploadMultipleFilesToCloudinary(
  files: File[],
  folder: string
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadFileToCloudinary(file, folder)));
}


export async function deleteFileFromCloudinary(url: string): Promise<void> {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  if (!match) return;

  const publicId = match[1];
  await cloudinary.uploader.destroy(publicId);
}