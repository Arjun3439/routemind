import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase.client";

export const storageService = {
  /**
   * Pick multiple images from device library
   */
  async pickImages(maxSelection = 5): Promise<ImagePicker.ImagePickerAsset[]> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      throw new Error("Sorry, we need camera roll permissions to upload images.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxSelection,
      quality: 0.8,
      base64: false, // read base64 via FileSystem below (more memory efficient)
    });

    if (!result || result.canceled) {
      return [];
    }
    return result.assets ?? [];
  },

  /**
   * Upload an array of picked images to Supabase Storage and return public URLs.
   * Uses FileSystem.readAsStringAsync to get base64 (works in React Native —
   * Blob uploads over fetch are NOT supported in the RN networking layer).
   */
  async uploadPostImages(userId: string, assets: ImagePicker.ImagePickerAsset[]): Promise<string[]> {
    const urls: string[] = [];

    for (const asset of assets) {
      try {
        const fileExt = (asset.uri.split(".").pop() || "jpg").toLowerCase();
        const mimeType = asset.mimeType || (fileExt === "png" ? "image/png" : "image/jpeg");
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Read file as base64 string via expo-file-system (works on both iOS and Android)
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64' as any,
        });

        // Convert base64 → ArrayBuffer (required by Supabase Storage JS in RN)
        const arrayBuffer = decode(base64);

        const { error } = await supabase.storage
          .from("post-images")
          .upload(fileName, arrayBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);

        urls.push(publicUrl);
        console.log("[StorageService] Uploaded:", publicUrl);
      } catch (err: any) {
        console.error("Upload failed for an image:", err);
        throw new Error(err.message || "Failed to upload image.");
      }
    }

    return urls;
  }
};
