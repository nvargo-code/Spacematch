import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./config";

export async function uploadImage(
  file: File,
  userId: string,
  folder: string = "posts"
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop();
  const fileName = `${folder}/${userId}/${timestamp}.${extension}`;

  const storageRef = ref(storage, fileName);

  // Compress image if needed (max 1MB)
  let fileToUpload = file;
  if (file.size > 1024 * 1024) {
    fileToUpload = await compressImage(file);
  }

  await uploadBytes(storageRef, fileToUpload);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

export async function uploadMultipleImages(
  files: File[],
  userId: string,
  folder: string = "posts"
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, userId, folder));
  return Promise.all(uploadPromises);
}

export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // Calculate new dimensions (max 1200px)
        let { width, height } = img;
        const maxSize = 1200;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileImage(
  file: File,
  userId: string
): Promise<string> {
  return uploadImage(file, userId, "profiles");
}
