import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase.client";
import { Platform } from "react-native";

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
      mediaTypes: ['images'], // Modern non-deprecated syntax
      allowsMultipleSelection: true,
      selectionLimit: maxSelection,
      quality: 0.8, // Compress slightly
    });

    // Check if user cancelled - modern expo-image-picker uses 'canceled' (single 'l')
    if (!result || result.canceled) {
      return [];
    }
    return result.assets ?? [];
  },

  /**
   * Upload an array of picked images to Supabase Storage and return public URLs
   */
  async uploadPostImages(userId: string, assets: ImagePicker.ImagePickerAsset[]): Promise<string[]> {
    const urls: string[] = [];

    for (const asset of assets) {
      try {
        // Generate a unique filename: userId/timestamp-random.jpg
        const fileExt = asset.uri.split(".").pop() || "jpg";
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Fetch the local file URI and convert it to a Blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        // Upload Blob to Supabase Storage
        const { data, error } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, {
            contentType: asset.mimeType || `image/${fileExt === "png" ? "png" : "jpeg"}`,
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error details:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);

        urls.push(publicUrl);
      } catch (err: any) {
        console.error("Upload failed for an image:", err);
        throw new Error(err.message || "Failed to upload image. Please verify storage permissions.");
      }
    }

    return urls;
  }
};
