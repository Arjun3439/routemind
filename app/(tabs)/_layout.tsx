import { Tabs } from "expo-router";
import { COLORS } from "@/constants";
import LiquidGlassTabBar from "@/components/LiquidGlassTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: "Route",
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
        }}
      />
    </Tabs>
  );
}
