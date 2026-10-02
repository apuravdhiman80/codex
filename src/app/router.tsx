import { createBrowserRouter, type RouteObject } from "react-router";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { RouteShellPage } from "../pages/RouteShellPage";

const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <RouteShellPage title="VisionID AI" /> },
      { path: "console", element: <RouteShellPage title="Vision Console" /> },
      { path: "objects", element: <RouteShellPage title="Object Detection" /> },
      { path: "enroll", element: <RouteShellPage title="Enroll a Person" /> },
      { path: "people", element: <RouteShellPage title="People Directory" /> },
      { path: "people/:personId", element: <RouteShellPage title="Person Profile" /> },
      { path: "history", element: <RouteShellPage title="Detection History" /> },
      { path: "settings", element: <RouteShellPage title="Settings" /> },
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
