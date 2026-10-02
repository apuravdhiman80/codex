import { VisionConsolePage } from "../vision/VisionConsolePage";
import type { VisionConsoleServices } from "../vision/visionServices";

interface ObjectDetectionPageProps {
  services?: Partial<VisionConsoleServices>;
}

export function ObjectDetectionPage({ services }: ObjectDetectionPageProps) {
  return <VisionConsolePage mode="objects" services={services} />;
}
