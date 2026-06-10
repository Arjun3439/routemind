import type { Place } from "@/types";

export async function requestNotificationPermissions(): Promise<boolean> {
  console.log("Mock: requestNotificationPermissions");
  return true;
}

export async function scheduleApproachNotification(
  place: Place,
  triggerInSeconds = 0
): Promise<string | null> {
  console.log("Mock: scheduleApproachNotification", place.name);
  return "mock-id";
}

export async function startGeofenceMonitoring(places: Place[]): Promise<void> {
  console.log("Mock: startGeofenceMonitoring", places.length);
}

export async function stopGeofenceMonitoring(): Promise<void> {
  console.log("Mock: stopGeofenceMonitoring");
}

export async function dismissAllNotifications(): Promise<void> {
  console.log("Mock: dismissAllNotifications");
}
