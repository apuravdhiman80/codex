import { lazy, Suspense, type ReactNode } from "react";
import { LoadingState } from "../components/LoadingState";

export const LandingPage = lazy(() => import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })));
export const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
export const EnrollmentPage = lazy(() => import("../features/enrollment/EnrollmentPage").then((module) => ({ default: module.EnrollmentPage })));
export const PeopleDirectoryPage = lazy(() => import("../features/people/PeopleDirectoryPage").then((module) => ({ default: module.PeopleDirectoryPage })));
export const PersonProfilePage = lazy(() => import("../features/people/PersonProfilePage").then((module) => ({ default: module.PersonProfilePage })));
export const VisionConsolePage = lazy(() => import("../features/vision/VisionConsolePage").then((module) => ({ default: module.VisionConsolePage })));
export const ObjectDetectionPage = lazy(() => import("../features/objects/ObjectDetectionPage").then((module) => ({ default: module.ObjectDetectionPage })));
export const DetectionHistoryPage = lazy(() => import("../features/history/DetectionHistoryPage").then((module) => ({ default: module.DetectionHistoryPage })));
export const SettingsPage = lazy(() => import("../features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function SuspendedPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState title="Loading view" description="Preparing the local vision workspace" />}>{children}</Suspense>;
}
