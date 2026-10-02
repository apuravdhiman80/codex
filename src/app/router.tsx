import { createBrowserRouter, type RouteObject } from "react-router";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { DetectionHistoryPage, EnrollmentPage, LandingPage, NotFoundPage, ObjectDetectionPage, PeopleDirectoryPage, PersonProfilePage, SettingsPage, SuspendedPage, VisionConsolePage } from "./routeComponents";

const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <SuspendedPage><LandingPage /></SuspendedPage> },
      { path: "console", element: <SuspendedPage><VisionConsolePage /></SuspendedPage> },
      { path: "objects", element: <SuspendedPage><ObjectDetectionPage /></SuspendedPage> },
      { path: "enroll", element: <SuspendedPage><EnrollmentPage /></SuspendedPage> },
      { path: "people", element: <SuspendedPage><PeopleDirectoryPage /></SuspendedPage> },
      { path: "people/:personId", element: <SuspendedPage><PersonProfilePage /></SuspendedPage> },
      { path: "history", element: <SuspendedPage><DetectionHistoryPage /></SuspendedPage> },
      { path: "settings", element: <SuspendedPage><SettingsPage /></SuspendedPage> },
      {
        path: "*",
        element: <SuspendedPage><NotFoundPage /></SuspendedPage>,
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
