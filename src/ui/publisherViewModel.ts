import type { PublisherStatus } from "../types";

export type PublisherAction = "prepare" | "publish" | "stop";
export type PublisherActionTone = "prepare" | "live" | "stop";

export interface PublisherActionView {
  action: PublisherAction;
  label: string;
  tone: PublisherActionTone;
}

export interface PublisherStatusView {
  label: string;
  primaryAction: PublisherActionView;
}

const PREPARE_ACTION: PublisherActionView = {
  action: "prepare",
  label: "송출 준비",
  tone: "prepare",
};

const PUBLISH_ACTION: PublisherActionView = {
  action: "publish",
  label: "송출 시작",
  tone: "live",
};

const STOP_ACTION: PublisherActionView = {
  action: "stop",
  label: "송출 종료",
  tone: "stop",
};

export const PUBLISHER_STATUS_VIEW: Readonly<Record<PublisherStatus, PublisherStatusView>> = {
  idle: { label: "대기", primaryAction: PREPARE_ACTION },
  requesting: { label: "권한 요청", primaryAction: STOP_ACTION },
  preview: { label: "미리보기", primaryAction: PUBLISH_ACTION },
  authorizing: { label: "인증 중", primaryAction: STOP_ACTION },
  connecting: { label: "연결 중", primaryAction: STOP_ACTION },
  live: { label: "LIVE", primaryAction: STOP_ACTION },
  reconnecting: { label: "재연결", primaryAction: STOP_ACTION },
  error: { label: "오류", primaryAction: PREPARE_ACTION },
};

export function publisherStatusView(status: PublisherStatus): PublisherStatusView {
  return PUBLISHER_STATUS_VIEW[status];
}
