# GCS Mobile Publisher

Android Chrome을 대상으로 한 GCS 현장 송출 전용 모바일 웹/PWA입니다.

## 포함 기능

- 후면 카메라 우선 720p WebRTC/WHIP 송출
- 마이크 캡처 및 송출 중 음소거
- GPS 위치, 고도, 정확도, 속도, 진행 방향
- 기기 기울기(`alpha`, `beta`, `gamma`)
- 배터리 잔량 및 충전 상태
- Screen Wake Lock으로 송출 중 화면 꺼짐 완화
- 기존 `media-control` publish authorization 계약 연동

## 요구 사항

- Android의 최신 Chrome 또는 Chromium 기반 브라우저
- 카메라, 마이크, GPS, 센서 접근이 가능한 HTTPS 주소
- GCS `media-control`, WHIP/MediaMTX, telemetry API
- 외부 이동통신망에서 쓸 경우 정상 구성된 STUN/TURN

브라우저가 백그라운드로 이동하거나 Android가 프로세스를 종료하는 경우 송출 지속은
보장되지 않습니다. 화면을 켜고 PWA를 전면에서 사용하는 운영 방식을 권장합니다.

## 화면 기준

- 주 설계 기준: Android 세로 `390 x 844 CSS px`
- 지원 범위: `360 x 640`부터 `480 x 960 CSS px`
- 최소 허용 폭: `320 CSS px`
- 터치 영역: 최소 `48 x 48 CSS px`
- 상단 상태 표시줄과 하단 제스처 영역: CSS `safe-area-inset-*` 반영
- 짧은 화면(`height <= 720px`): 센서 패널과 수평계 자동 축소
- 가로 화면: 조작 오류 방지를 위해 세로 회전 안내 표시

실제 물리 픽셀 수가 아니라 브라우저가 제공하는 CSS 픽셀을 기준으로 배치합니다. 따라서
고밀도 디스플레이에서도 같은 조작 크기를 유지합니다.

## 실행

```bash
cp .env.example .env
npm install
npm run dev
```

같은 Wi-Fi의 Android 기기에서 개발 서버로 접근할 때에도 카메라/GPS 테스트에는 HTTPS가
필요합니다. 운영에서는 Nginx 등의 HTTPS 경로 아래에 `dist/`를 배포하세요.

## API 계약

송출 권한:

```text
GET {VITE_STREAM_API_BASE_URL}/api/v1/streams/{streamId}/publish
Authorization: Bearer <access token>
```

응답:

```json
{
  "whipUrl": "https://example.com/webrtc/raw/CID001/whip?token=...",
  "iceServers": []
}
```

센서 텔레메트리는 기본적으로 `POST /api/telemetry/`에 2초 간격으로 전송합니다. 기존
백엔드가 확장 필드를 아직 허용하지 않는 경우 orientation/battery 필드를 수용하도록
telemetry DTO를 확장하거나 모바일 전용 ingest endpoint를 추가해야 합니다.
