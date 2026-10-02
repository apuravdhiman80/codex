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
  { path: "/console", heading: "Vision Console" },
  { path: "/objects", heading: "Object Detection" },
  { path: "/enroll", heading: "Enroll a Person" },
  { path: "/people", heading: "People Directory" },
  { path: "/people/demo-person", heading: "Person Profile" },
  { path: "/history", heading: "Detection History" },
  { path: "/settings", heading: "Settings" },
];

describe("application routes", () => {
  it("renders every required route with a main landmark and heading", () => {
    expect(routerModule, "src/app/router.tsx should export appRouter").toBeDefined();
    if (!routerModule) return;

    for (const routeCase of routeCases) {
      const router = createMemoryRouter(routerModule.appRouter.routes, {
        initialEntries: [routeCase.path],
      });
      const view = render(<RouterProvider router={router} />);

      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: routeCase.heading }),
      ).toBeInTheDocument();

      view.unmount();
    }
  });

  it("shows an accessible not-found page with a home link", () => {
    expect(routerModule, "src/app/router.tsx should export appRouter").toBeDefined();
    if (!routerModule) return;

    const router = createMemoryRouter(routerModule.appRouter.routes, {
      initialEntries: ["/not-a-visionid-route"],
    });
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute("href", "/");
  });
});
