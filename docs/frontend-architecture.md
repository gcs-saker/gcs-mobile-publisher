# Frontend architecture

## 목표 구조

기능 로직과 UI 렌더링을 분리합니다. `.ts`는 도메인·정책·adapter·hook을, `.tsx`는
React UI 구성만 담당합니다.

```text
src/
  app/
    providers/
    routes/
  features/
    publisher/
      domain/
      application/
      infrastructure/
      hooks/
      contracts/
    telemetry/
    device-auth/
    pwa/
  ui/
    atoms/
    molecules/
    organisms/
    templates/
  shared/
    config/
    errors/
    testing/
```

## 계층 규칙

- `domain`: 순수 TypeScript 정책과 타입. React와 브라우저 API를 import하지 않습니다.
- `application`: use case와 port interface. 구체 네트워크·저장소 구현을 모릅니다.
- `infrastructure`: WebRTC, Geolocation, Battery, HTTP, IndexedDB adapter.
- `hooks`: application use case를 React 생명주기에 연결합니다.
- `ui`: props와 event만 사용하고 브라우저 API나 HTTP를 직접 호출하지 않습니다.

의존 방향은 UI/infrastructure → application → domain입니다. domain이 바깥 계층을
참조하지 않습니다.

## UI와 Atomic Design

- Atom: Button, Badge, Input, StatusDot
- Molecule: StreamIdField, BatteryStatus, NetworkStatus
- Organism: TelemetryPanel, PublisherControls, CameraViewport
- Template: PublisherScreenTemplate

같은 구조와 동작이 두 번 나타나면 공용 component 후보로 검토합니다. 단순히 미래에 쓸 수
있다는 이유만으로 추상화하지 않습니다.

## 상태 관리

- 서버 상태: TanStack Query
- 송출 세션과 복합 전이: reducer 또는 외부 store
- 영속 설정: repository interface 뒤의 IndexedDB adapter
- 단순하고 지역적인 UI 상태만 `useState`
- 외부 시스템 동기화에만 `useEffect`

interval polling을 component에서 직접 만들지 않습니다. 서버 데이터는 TanStack Query의
`refetchInterval`, 장치·WebRTC 상태는 전용 service/hook을 사용합니다.

민감한 access token은 IndexedDB나 Local Storage에 평문 저장하지 않습니다. 가능한 경우
Secure/HttpOnly cookie 또는 단기 메모리 session을 사용합니다. IndexedDB는 비민감 장비
설정, 전송 대기열, 마지막 정상 설정 등에 사용합니다.

## Dependency injection

모든 외부 의존성은 interface(port)를 먼저 정의합니다.

```ts
export interface PublisherGateway {
  authorize(streamId: string, signal?: AbortSignal): Promise<PublishAuthorization>;
  connect(input: ConnectPublisherInput): Promise<PublisherSession>;
}
```

기본 adapter는 provider에서 주입하며 테스트에서는 fake를 주입합니다. 런타임 구성 또는
feature flag에 따라 adapter를 교체할 수 있어야 합니다. domain/application 코드에서
`fetch`, `navigator`, `window`, `RTCPeerConnection`을 직접 참조하지 않습니다.

## TDD와 OCP

- 정책은 실패 테스트를 먼저 작성합니다.
- UI는 사용자 관찰 가능한 행위를 테스트합니다.
- browser adapter는 contract test로 검증합니다.
- 새 품질 정책, 저장소, 인증 방식 추가 시 기존 use case 수정 대신 interface 구현 추가를
  우선합니다.
- 테스트가 구현 세부 사항이나 hook 호출 횟수에 결합되지 않도록 합니다.

필수 검증:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

향후 CI에서는 lint, coverage threshold, Playwright Android viewport test를 추가합니다.
