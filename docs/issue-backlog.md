# Issue backlog

이 문서는 원격 저장소 생성 후 GitHub Issue로 등록할 실행 백로그입니다. 번호는 등록 전 임시
식별자이며 GitHub Issue 번호가 생성되면 `MOB-xx`와 실제 번호를 함께 표시합니다.

## Milestones and PR plan

| Milestone | Issues | PR | 완료 tag |
|---|---|---|---|
| Foundation | MOB-00~05 | PR-A Architecture foundation | 없음 |
| Publisher MVP | MOB-06~11 | PR-B Publisher runtime, PR-C Mobile UI | `v0.1.0` |
| Device validation | MOB-12~14 | PR-D Android validation | `v0.2.0` |
| Server integration | MOB-15~17 | PR-E Platform integration | `v0.3.0` |
| Production | MOB-18~20 | PR-F Release hardening | `v1.0.0-rc.1`, `v1.0.0` |

PR은 표의 범위를 기계적으로 한 번에 합치는 단위가 아닙니다. diff가 커지거나 독립 배포가
가능하면 같은 그룹 안에서도 더 작은 PR로 나눕니다.

## Foundation

### MOB-00 Repository hygiene

- 상태: 완료 (`f04f910`)
- 목적: 소스, 의존성 선언, lockfile, 안전한 설정 예시만 Git으로 관리합니다.
- 완료 조건:
  - dependency/build/test/IDE/secret 산출물이 ignore됩니다.
  - `.env.example`은 추적됩니다.
  - 이미 추적된 secret과 generated artifact가 없습니다.

### MOB-01 Enforce CI quality gates

- 유형: Chore
- 선행: MOB-00
- 목적: 모든 PR에서 typecheck, unit test, build, diff hygiene를 자동 검증합니다.
- TDD/검증:
  - 실패하는 샘플 변경에서 CI가 실패하는지 확인합니다.
  - branch protection의 필수 check 이름을 문서화합니다.
- 완료 조건:
  - GitHub Actions가 `pnpm install --frozen-lockfile`, typecheck, test, build를 실행합니다.
  - concurrency cancel과 dependency cache가 적용됩니다.

### MOB-02 Define ports and runtime dependency container

- 유형: Refactor
- 선행: MOB-01
- 목적: `fetch`, `navigator`, `RTCPeerConnection`, clock, timer를 interface 뒤로 이동합니다.
- 주요 port:
  - `PublisherGateway`
  - `TelemetryGateway`
  - `DeviceSensorGateway`
  - `SettingsRepository`
  - `Clock`, `Scheduler`, `NetworkMonitor`
- 완료 조건:
  - domain/application 계층이 브라우저 전역을 참조하지 않습니다.
  - provider에서 기본 adapter를 주입하고 테스트에서 fake로 교체할 수 있습니다.
  - 런타임 feature flag로 adapter를 변경할 수 있습니다.

### MOB-03 Split publisher domain, application, infrastructure, and hooks

- 유형: Refactor
- 선행: MOB-02
- 목적: 현재 `App.tsx`의 송출·센서·재연결 책임을 기능 모듈로 분리합니다.
- 완료 조건:
  - 상태 전이는 순수 reducer/state machine으로 테스트됩니다.
  - `App.tsx`에는 조합과 route 책임만 남습니다.
  - `.ts`에 기능, `.tsx`에 표시 책임만 존재합니다.
  - 기존 사용자 동작을 contract test가 보존합니다.

### MOB-04 Introduce application store

- 유형: Refactor
- 선행: MOB-03
- 목적: 복합 송출 상태를 외부 store로 이동해 산발적인 `useState`를 제거합니다.
- 권장: Zustand 또는 동등한 작은 store
- 완료 조건:
  - 송출 상태, 선택 장비, 음소거, 품질, 재연결 횟수를 하나의 명시적 store가 관리합니다.
  - component는 selector로 필요한 상태만 구독합니다.
  - store 구현은 application interface 뒤에서 교체 가능합니다.

### MOB-05 Add IndexedDB settings and queue repositories

- 유형: Feature
- 선행: MOB-02
- 목적: 비민감 설정과 미전송 telemetry queue를 IndexedDB에 저장합니다.
- 완료 조건:
  - Stream ID, 품질 선호, 장비 설정이 schema version과 함께 저장됩니다.
  - access token은 IndexedDB/Local Storage에 평문 저장하지 않습니다.
  - quota, migration, corrupt record fallback 테스트가 있습니다.
  - memory repository를 테스트와 비지원 브라우저 fallback으로 주입할 수 있습니다.

## Publisher MVP

### MOB-06 Implement device authentication onboarding

- 유형: Feature
- 선행: MOB-04, MOB-05
- 목적: 토큰 직접 입력을 장비 등록 또는 로그인 기반 onboarding으로 교체합니다.
- 완료 조건:
  - 인증 port는 cookie, bearer, one-time device code adapter를 교체할 수 있습니다.
  - 만료·갱신·로그아웃 전이가 테스트됩니다.
  - 민감 값이 UI, 로그, IndexedDB에 노출되지 않습니다.

### MOB-07 Build publisher session state machine

- 유형: Feature
- 선행: MOB-03, MOB-04
- 목적: prepare/authorize/connect/live/reconnect/stop 전이를 명시적 정책으로 관리합니다.
- 완료 조건:
  - 불가능한 전이가 type 또는 reducer에서 차단됩니다.
  - 중복 publish, stop 중 reconnect, stale callback 회귀 테스트가 있습니다.
  - session resource 정리가 idempotent합니다.

### MOB-08 Implement reconnect policy and network handover

- 유형: Feature
- 선행: MOB-07
- 목적: LTE↔Wi-Fi, offline/online, ICE failed 상황을 자동 복구합니다.
- 완료 조건:
  - jitter가 포함된 제한형 exponential backoff를 사용합니다.
  - 최대 시도 후 사용자 개입 상태로 전환합니다.
  - fake clock과 network monitor로 결정론적 테스트가 가능합니다.
  - 연결 복구 중 telemetry 중복 전송이 없습니다.

### MOB-09 Implement adaptive uplink quality policy

- 유형: Feature
- 선행: MOB-07
- 목적: WebRTC 통계와 장치 상태에 따라 720p/540p/360p를 조절합니다.
- 완료 조건:
  - 하향·상향 threshold와 hysteresis가 순수 정책으로 분리됩니다.
  - 빈번한 품질 진동을 방지합니다.
  - 발열 또는 저전력 상태에서 상한을 낮출 수 있는 확장 port가 있습니다.
  - adapter 미지원 시 안전하게 고정 품질로 fallback합니다.

### MOB-10 Implement telemetry sampling and offline delivery

- 유형: Feature
- 선행: MOB-05, MOB-07
- 목적: GPS·기울기·배터리를 표본화하고 네트워크 복구 시 순서대로 전송합니다.
- 권장: TanStack Query mutation과 IndexedDB queue 조합
- 완료 조건:
  - component에서 `setInterval`로 서버 전송하지 않습니다.
  - sampling과 upload 주기를 별도로 구성할 수 있습니다.
  - deduplication, retry, max queue size, expiry 정책이 테스트됩니다.
  - 정확한 GPS와 token은 로그에 기록되지 않습니다.

### MOB-11 Rebuild UI with Atomic components

- 유형: Refactor/Feature
- 선행: MOB-04, MOB-07
- 목적: 모바일 UI를 atoms/molecules/organisms/template 구조로 재구성합니다.
- 구성:
  - atoms: Button, Input, Badge, StatusDot
  - molecules: BatteryStatus, NetworkStatus, QualityStatus, StreamField
  - organisms: CameraViewport, TelemetryPanel, PublisherControls
  - template: PublisherScreenTemplate
- 완료 조건:
  - UI component가 HTTP, IndexedDB, WebRTC, navigator를 직접 참조하지 않습니다.
  - 360×640~480×960, safe area, 48px touch target을 component test로 검증합니다.
  - loading/error/permission/reconnect 상태의 접근 가능한 label이 있습니다.

`MOB-06~11` 완료 및 전체 검증 후 `v0.1.0` tag를 생성합니다.

## Device validation

### MOB-12 Add Android viewport and browser E2E matrix

- 유형: Test
- 선행: MOB-11
- 목적: Playwright로 주요 Android CSS viewport와 권한 상태를 자동 검증합니다.
- 대상: 360×640, 390×844, 412×915, 480×960
- 완료 조건:
  - overflow, safe area, landscape notice, touch target test가 있습니다.
  - 카메라/GPS/배터리 adapter를 deterministic fake로 교체합니다.

### MOB-13 Execute Galaxy physical-device matrix

- 유형: Test
- 선행: MOB-08~12
- 목적: 보급형·중급형·플래그십 Galaxy에서 실사용을 검증합니다.
- 항목: 권한, 카메라 전환, 30/60분 발열, 배터리 소모, LTE/Wi-Fi handover, 화면 잠금
- 완료 조건:
  - 기기/Android/Chrome/네트워크/결과를 표준 양식으로 기록합니다.
  - blocker는 독립 Bug Issue로 분리합니다.

### MOB-14 Validate TURN and adverse networks

- 유형: Test
- 선행: MOB-08, MOB-09
- 목적: carrier NAT, 제한 Wi-Fi, packet loss, latency에서 송출을 검증합니다.
- 완료 조건:
  - relay 사용 여부와 실패 원인을 개인정보 없는 지표로 확인할 수 있습니다.
  - 네트워크 조건별 첫 연결 시간과 복구 시간을 기록합니다.

`MOB-12~14` 통과 후 `v0.2.0` tag를 생성합니다.

## Server integration

### MOB-15 Extend backend mobile telemetry contract

- 유형: Feature
- 선행: MOB-10
- 목적: `docs/telemetry-contract.md`를 서버 DTO, DB 최신 상태/이력에 반영합니다.
- 완료 조건:
  - null sensor field, server receive time, rate limit, authorization을 처리합니다.
  - migration과 하위 호환 테스트가 있습니다.
  - 위치 원문이 운영 로그에 남지 않습니다.

### MOB-16 Implement device registration and token lifecycle

- 유형: Feature
- 선행: MOB-06
- 목적: 장비 코드 발급, 사용자 승인, 단기 credential 갱신·폐기를 구현합니다.
- 완료 조건:
  - 분실 장비 credential을 서버에서 폐기할 수 있습니다.
  - stream publish와 telemetry 권한이 동일 장비 identity에 결합됩니다.

### MOB-17 Add observability and privacy-safe diagnostics

- 유형: Feature
- 선행: MOB-08~10, MOB-15
- 목적: 연결 상태, ICE path, 품질 전환, retry를 낮은 cardinality 지표로 제공합니다.
- 완료 조건:
  - token, SDP, GPS 원문, media payload를 기록하지 않습니다.
  - client trace ID로 서버 control-plane 요청과 연계할 수 있습니다.

`MOB-15~17` 통합 검증 후 `v0.3.0` tag를 생성합니다.

## Production

### MOB-18 Harden PWA updates and recovery

- 유형: Feature
- 선행: MOB-12
- 목적: 서비스 워커 업데이트 중 송출 중단과 오래된 캐시 문제를 방지합니다.
- 완료 조건:
  - 송출 중에는 강제 reload하지 않습니다.
  - 새 버전 대기/적용 UI와 cache migration 테스트가 있습니다.
  - offline shell과 실제 송출 불가 상태를 명확히 구분합니다.

### MOB-19 Security, accessibility, and performance gate

- 유형: Chore/Test
- 선행: MOB-15~18
- 완료 조건:
  - dependency audit와 secret scan을 통과합니다.
  - WCAG 핵심 keyboard/label/contrast 검증을 통과합니다.
  - 초기 bundle, memory growth, 60분 송출 자원 사용 예산을 만족합니다.

### MOB-20 Release candidate and production runbook

- 유형: Release
- 선행: 모든 Issue
- 목적: 배포, 모니터링, 장애 대응, 롤백 절차를 확정합니다.
- 완료 조건:
  - staging smoke와 현장 승인 후 `v1.0.0-rc.1`을 생성합니다.
  - blocker 해결 및 운영 승인 후 `v1.0.0`을 생성합니다.
  - GitHub Release에 변경점, 제한, 지원 기기, rollback 정보를 기록합니다.

## Label set

```text
type:feature
type:bug
type:refactor
type:test
type:docs
type:chore
type:release
area:architecture
area:publisher
area:telemetry
area:auth
area:ui
area:pwa
area:backend
status:triage
status:ready
status:blocked
status:in-progress
priority:p0
priority:p1
priority:p2
```
