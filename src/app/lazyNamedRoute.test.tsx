import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { lazyNamedRoute } from "./lazyNamedRoute";

describe("lazyNamedRoute", () => {
  it("shows the router fallback until the requested page module is loaded", async () => {
    let resolveModule: (
      module: Record<"TestPage", () => React.JSX.Element>,
    ) => void = () => undefined;
    const modulePromise = new Promise<Record<"TestPage", () => React.JSX.Element>>(
      (resolve) => {
        resolveModule = resolve;
      },
    );
    const router = createMemoryRouter(
      [
        {
          path: "/",
          lazy: lazyNamedRoute(() => modulePromise, "TestPage"),
          HydrateFallback: () => <p role="status">Loading route</p>,
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading route");

    resolveModule({ TestPage: () => <h1>Lazy page</h1> });

    expect(
      await screen.findByRole("heading", { name: "Lazy page" }),
    ).toBeInTheDocument();
  });
});
