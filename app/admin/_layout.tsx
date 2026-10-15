import { Redirect, Stack, useSegments, type Href } from "expo-router";
import { useWindowDimensions, View } from "react-native";

import Sidebar from "@/components/admin/Sidebar";
import { SIDEBAR_BREAKPOINT } from "@/components/admin/nav";
import { C } from "@/components/admin/ui";
import { useStaff } from "@/context/StaffContext";
import { useDirection } from "@/lib/i18n";

// expo-router generates its route union from a filesystem scan that lags behind newly added
// files, so app/admin/login.jsx isn't in the union until the dev server happens to rescan.
// The route exists; this keeps the build stable instead of depending on that timing.
const LOGIN = "/admin/login" as Href;
const HOME = "/admin" as Href;

export default function AdminLayout() {
  const { staff, loading } = useStaff();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const dir = useDirection();

  if (loading) return null;

  const onLoginScreen = segments[segments.length - 1] === "login";

  // No staff session — everything under /admin funnels to the staff sign-in screen.
  // This is a routing decision only; each API route re-checks the session and the role.
  if (!staff && !onLoginScreen) return <Redirect href={LOGIN} />;
  if (staff && onLoginScreen) return <Redirect href={HOME} />;

  const stack = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;

  // Wide screens keep every section one click away in a sidebar; phones navigate via the dashboard.
  if (onLoginScreen || width < SIDEBAR_BREAKPOINT) return stack;

  return (
    <View style={[{ flex: 1, backgroundColor: C.bg }, dir.row]}>
      <Sidebar />
      <View style={{ flex: 1 }}>{stack}</View>
    </View>
  );
}
