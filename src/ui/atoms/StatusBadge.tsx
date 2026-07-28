import type { PublisherStatus } from "../../types";
import { publisherStatusView } from "../publisherViewModel";

export interface StatusBadgeProps {
  status: PublisherStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <div className={`live-pill live-pill--${status}`} role="status">
      {publisherStatusView(status).label}
    </div>
  );
}
