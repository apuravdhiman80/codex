import { ArrowLeft, SearchX } from "lucide-react";
import { Link } from "react-router";

export function NotFoundPage() {
  return <section className="not-found-page" aria-labelledby="not-found-title"><div className="not-found-icon"><SearchX size={27} aria-hidden="true" /></div><p className="eyebrow">404 · ROUTE NOT FOUND</p><h1 id="not-found-title">This view isn’t on the map</h1><p>The page may have moved. Your local profiles and history are still stored on this device.</p><Link className="button-primary" to="/"><ArrowLeft size={15} /> Return to overview</Link></section>;
}
