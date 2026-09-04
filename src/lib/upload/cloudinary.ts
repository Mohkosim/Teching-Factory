import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type ResourceType = "image" | "video" | "raw" | "auto";

export async function uploadFileToCloudinary(
  file: File,
  folder: string,
  resourceType: ResourceType = "image"
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `teaching-factory/${folder}`, resource_type: resourceType },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error ?? new Error("Upload ke Cloudinary gagal tanpa detail error"));
          return;
        }
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  return result.secure_url;
}

export async function uploadMultipleFilesToCloudinary(
  files: File[],
  folder: string,
  resourceType: ResourceType = "image"
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadFileToCloudinary(file, folder, resourceType)));
}

// Khusus avatar: input-nya base64 data-URI langsung dari req.json(), bukan File/FormData
export async function uploadBase64ToCloudinary(
  base64DataUri: string,
  folder: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: `teaching-factory/${folder}`,
    resource_type: "image",
  });
  return result.secure_url;
}

export async function deleteFileFromCloudinary(url: string): Promise<void> {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  if (!match) return;
  const publicId = match[1];
  await cloudinary.uploader.destroy(publicId);
}