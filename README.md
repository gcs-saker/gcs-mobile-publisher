# GCS Mobile Publisher

Android Chrome을 대상으로 하는 GCS 현장 송출용 모바일 PWA입니다.

## 보안 모델

모바일은 송출 대상 그룹, 스트림 ID 또는 서버 내부 경로를 선택하지 않습니다.

1. 관리자가 그룹에 귀속된 일회용 기기 등록 코드를 발급합니다.
2. 모바일은 등록 코드와 기기 이름으로 UUID 및 Credential을 발급받습니다.
3. 이후 모바일은 UUID와 Credential로만 기기 신원을 증명합니다.
4. 서버는 등록 원장에서 그룹, 센서 및 스트림 경로를 결정합니다.
5. 모바일은 서버가 발급한 짧은 수명의 송출 세션으로 WHIP 연결을 생성합니다.

Credential은 브라우저 영구 저장소에 저장하지 않고 현재 실행의 메모리에만 유지합니다. 페이지를 새로 열면 UUID와 Credential을 다시 입력해야 합니다.

## 주요 기능

- 후면 카메라 우선 720p WebRTC/WHIP 송출
- 서버 소유 기기·그룹·스트림 식별자 사용
- 마이크 캡처와 송출 중 음소거
- GPS, 기기 기울기, 배터리 상태 수집
- Screen Wake Lock
- LTE/Wi-Fi 단절 감지와 재연결
- 네트워크 상태 기반 720p/540p/360p 품질 조절
- Android 세로 화면과 safe area 대응

## 실행

```bash
cp .env.example .env
pnpm install
pnpm dev
```

카메라, 마이크, GPS와 기기 센서 권한에는 HTTPS가 필요합니다.

## 기기 등록 API

```http
POST /auth-policy/device-bootstrap/register
Content-Type: application/json

{
  "provisioningToken": "<관리자가 발급한 코드>",
  "displayName": "현장 Pixel",
  "deviceType": "mobile",
  "sensors": [{ "sensorId": "front", "sensorType": "camera" }]
}
```

요청에는 `groupId`, `streamId`, `path`를 포함하지 않습니다.

## 송출 세션 API

```http
POST /media-control/api/v1/device/publish-sessions
X-GCS-Device-UUID: <device UUID>
X-GCS-Device-Credential: <device credential>
Content-Type: application/json

{ "sensorId": "front" }
```

서버가 등록 장비의 그룹과 스트림을 결정하여 `streamId`, `publishUrl`, `publishToken`, `renewalToken`, `iceServers`를 반환합니다. 모바일은 `publishToken`을 WHIP 요청의 Bearer 인증으로 사용합니다.

## 검증

```bash
pnpm check
```

`check`는 엄격한 TypeScript 검사, 전체 테스트와 프로덕션 빌드를 순서대로 실행합니다.

## 프로젝트 문서

- [기여 및 커밋/PR 규칙](CONTRIBUTING.md)
- [Git workflow와 tag 정책](docs/git-workflow.md)
- [Frontend architecture](docs/frontend-architecture.md)
- [Issue backlog](docs/issue-backlog.md)
- [Roadmap](docs/roadmap.md)
