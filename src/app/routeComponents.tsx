import { lazy, Suspense, type ReactNode } from "react";
import { LoadingState } from "../components/LoadingState";

export const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
export const ObjectDetectionPage = lazy(() => import("../features/objects/ObjectDetectionPage").then((module) => ({ default: module.ObjectDetectionPage })));

export function SuspendedPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState title="Loading view" description="Opening object detection" />}>{children}</Suspense>;
}
