import { createBrowserRouter, type RouteObject } from "react-router";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { NotFoundPage, ObjectDetectionPage, SuspendedPage } from "./routeComponents";

const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <SuspendedPage><ObjectDetectionPage /></SuspendedPage> },
      { path: "objects", element: <SuspendedPage><ObjectDetectionPage /></SuspendedPage> },
      {
        path: "*",
        element: <SuspendedPage><NotFoundPage /></SuspendedPage>,
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
