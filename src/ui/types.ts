import type { usePublisherController } from "../features/publisher/hooks/usePublisherController";

export type ActionButtonTone = "default" | "live" | "stop" | "secondary";
export type ReturnTypeOfPublisherController = ReturnType<typeof usePublisherController>;
