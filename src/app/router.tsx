import { createBrowserRouter, type RouteObject } from "react-router";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { RouteShellPage } from "../pages/RouteShellPage";
import { EnrollmentPage } from "../features/enrollment/EnrollmentPage";
import { PeopleDirectoryPage } from "../features/people/PeopleDirectoryPage";
import { PersonProfilePage } from "../features/people/PersonProfilePage";
import { VisionConsolePage } from "../features/vision/VisionConsolePage";
import { ObjectDetectionPage } from "../features/objects/ObjectDetectionPage";
import { DetectionHistoryPage } from "../features/history/DetectionHistoryPage";
import { SettingsPage } from "../features/settings/SettingsPage";

const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <RouteShellPage title="VisionID AI" /> },
      { path: "console", element: <VisionConsolePage /> },
      { path: "objects", element: <ObjectDetectionPage /> },
      { path: "enroll", element: <EnrollmentPage /> },
      { path: "people", element: <PeopleDirectoryPage /> },
      { path: "people/:personId", element: <PersonProfilePage /> },
      { path: "history", element: <DetectionHistoryPage /> },
      { path: "settings", element: <SettingsPage /> },
      {
        path: "*",
        element: (
          <RouteShellPage
            title="Page not found"
            description="That route is not part of VisionID AI."
          >
            <a className="text-cyan-300 underline underline-offset-4" href="/">
              Return home
            </a>
          </RouteShellPage>
        ),
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
