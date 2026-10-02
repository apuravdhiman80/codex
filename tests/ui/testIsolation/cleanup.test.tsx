import { useEffect } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

let disposeCount = 0;

function LifecycleProbe() {
  useEffect(() => () => { disposeCount += 1; }, []);
  return <span>mounted</span>;
}

describe("React test cleanup", () => {
  it("renders a component whose effect must be disposed after the test", () => {
    disposeCount = 0;
    render(<LifecycleProbe />);
  });

  it("unmounts the previous test tree so its effects cannot leak", () => {
    expect(disposeCount).toBe(1);
  });
});
