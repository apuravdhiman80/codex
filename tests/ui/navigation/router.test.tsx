import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { describe, expect, it } from "vitest";

type RouterModule = {
  appRouter: {
    routes: RouteObject[];
  };
};

const routeModules = import.meta.glob<RouterModule>("/src/app/router.tsx", {
  eager: true,
});
const routerModule = routeModules["/src/app/router.tsx"];

const routeCases = [
  { path: "/", heading: "VisionID AI" },
  { path: "/console", heading: "Vision Fusion Console" },
  { path: "/objects", heading: "Object Detection Console" },
  { path: "/enroll", heading: "Enroll a Person" },
  { path: "/people", heading: "People Directory" },
  { path: "/people/demo-person", heading: "Person Profile" },
  { path: "/history", heading: "Detection History" },
  { path: "/settings", heading: "Settings" },
];

describe("application routes", () => {
  it("renders every required route with a main landmark and heading", async () => {
    expect(routerModule, "src/app/router.tsx should export appRouter").toBeDefined();
    if (!routerModule) return;

    for (const routeCase of routeCases) {
      const router = createMemoryRouter(routerModule.appRouter.routes, {
        initialEntries: [routeCase.path],
      });
      const view = render(<RouterProvider router={router} />);

      expect(screen.getByRole("main")).toBeInTheDocument();
      await expect(screen.findByRole("heading", { level: 1, name: routeCase.heading }, { timeout: 5000 })).resolves.toBeInTheDocument();

      view.unmount();
    }
  }, 30000);

  it("shows an accessible not-found page with a home link", async () => {
    expect(routerModule, "src/app/router.tsx should export appRouter").toBeDefined();
    if (!routerModule) return;

    const router = createMemoryRouter(routerModule.appRouter.routes, {
      initialEntries: ["/not-a-visionid-route"],
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: /isn’t on the map/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to overview/i })).toHaveAttribute("href", "/");
  });
});
