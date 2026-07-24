# Fixed delivery roadmap

이 문서는 모바일 송출기 개발의 고정 우선순위입니다. GitHub 원격 저장소가 생성되면 이
문서를 Tracking Issue로 등록하고 pin합니다.

순서를 변경하려면 단순 Issue 재배치가 아니라 변경 이유, 위험, 의존성 영향을 기록한
Architecture Decision Record와 maintainer 승인이 필요합니다.

## Current

| 순번 | Issue | 상태 | 통과 조건 |
|---:|---|---|---|
| 0 | MOB-00 Repository hygiene | 완료 | `.gitignore` 및 secret/generated file 제외 |
| 1 | MOB-01 CI quality gates | 구현 완료·PR 대기 | 필수 CI check와 branch protection |
| 2 | MOB-02 Runtime dependency ports | 대기 | 브라우저 전역이 interface 뒤로 이동 |
| 3 | MOB-03 Feature/UI architecture split | 대기 | 기능 `.ts`, UI `.tsx`, 계층 의존 방향 준수 |
| 4 | MOB-04 Application store | 대기 | 복합 송출 상태를 외부 store로 관리 |
| 5 | MOB-05 IndexedDB repositories | 대기 | 비민감 설정과 telemetry queue 영속화 |

Foundation 1~5가 끝나기 전에는 새 UI 기능을 확장하지 않습니다. 기존 코드의 동작 보존과
테스트 가능한 경계를 먼저 확보합니다.

## Publisher MVP

| 순번 | Issue | 선행 | 통과 조건 |
|---:|---|---|---|
| 6 | MOB-07 Publisher session state machine | MOB-03, 04 | 불가능한 전이와 stale callback 차단 |
| 7 | MOB-06 Device authentication onboarding | MOB-04, 05 | token 직접 입력 제거와 credential lifecycle |
| 8 | MOB-11 Atomic mobile UI | MOB-04, 07 | 360~480px UI와 기능/UI 완전 분리 |
| 9 | MOB-08 Reconnect and handover policy | MOB-07 | LTE↔Wi-Fi 및 offline 자동 복구 |
| 10 | MOB-09 Adaptive uplink quality | MOB-07 | hysteresis가 있는 720p/540p/360p 정책 |
| 11 | MOB-10 Telemetry offline delivery | MOB-05, 07 | Query mutation과 IndexedDB queue |

MOB-06과 MOB-07은 담당자가 다르면 병렬 진행할 수 있습니다. MOB-08, 09, 10도 session
interface가 고정된 이후에는 병렬화할 수 있지만 merge 순서는 8 → 9 → 10으로 유지합니다.

MOB-06~11 완료 후 전체 테스트와 smoke test를 수행하고 `v0.1.0` tag를 생성합니다.

## Android validation

| 순번 | Issue | 선행 | 통과 조건 |
|---:|---|---|---|
| 12 | MOB-12 Android viewport/browser E2E | MOB-11 | 4개 viewport와 권한 상태 자동 검증 |
| 13 | MOB-14 TURN/adverse network validation | MOB-08, 09 | carrier NAT와 packet loss 기준 충족 |
| 14 | MOB-13 Galaxy physical-device matrix | MOB-08~12, 14 | 보급·중급·플래그십 장시간 검증 |

검증 순서는 자동 E2E → 네트워크 실험 → Galaxy 실기기입니다. 실기기 테스트에서 발견한
blocker는 별도 Bug Issue로 만들고 모두 닫은 뒤 `v0.2.0` tag를 생성합니다.

## Platform integration

| 순번 | Issue | 선행 | 통과 조건 |
|---:|---|---|---|
| 15 | MOB-15 Backend mobile telemetry | MOB-10 | DTO·DB·권한·rate limit 통합 |
| 16 | MOB-16 Device registration lifecycle | MOB-06 | 등록·승인·갱신·폐기 |
| 17 | MOB-17 Privacy-safe observability | MOB-08~10, 15 | token/GPS 없는 진단과 trace 연계 |

MOB-15와 MOB-16은 서버 담당자가 다르면 병렬 진행할 수 있습니다. 두 계약이 고정된 다음
MOB-17을 merge합니다. 통합 smoke test 통과 후 `v0.3.0` tag를 생성합니다.

## Production

| 순번 | Issue | 선행 | 통과 조건 |
|---:|---|---|---|
| 18 | MOB-18 PWA update and recovery | MOB-12 | 송출 중 reload 방지와 cache migration |
| 19 | MOB-19 Security/accessibility/performance | MOB-15~18 | 모든 운영 quality budget 통과 |
| 20 | MOB-20 Release candidate/runbook | 전체 | 배포·모니터링·롤백 승인 |

MOB-20 staging 승인을 기준으로 `v1.0.0-rc.1`, 현장 운영 승인을 기준으로 `v1.0.0`을
생성합니다.

## Pull request queue

PR은 다음 순서로 base branch에 반영합니다.

```text
PR-01  MOB-01 CI quality gates
PR-02  MOB-02 Dependency ports
PR-03  MOB-03 Architecture split
PR-04  MOB-04 Application store
PR-05  MOB-05 IndexedDB repositories
PR-06  MOB-07 Publisher state machine
PR-07  MOB-06 Authentication onboarding
PR-08  MOB-11 Atomic mobile UI
PR-09  MOB-08 Reconnect policy
PR-10  MOB-09 Adaptive quality
PR-11  MOB-10 Telemetry delivery
PR-12  MOB-12 Android E2E
PR-13  MOB-14 Network validation
PR-14  MOB-13 Physical devices
PR-15  MOB-15 Backend telemetry
PR-16  MOB-16 Device registration
PR-17  MOB-17 Observability
PR-18  MOB-18 PWA recovery
PR-19  MOB-19 Production gates
PR-20  MOB-20 Release
```

앞선 PR이 merge되지 않은 상태에서 다음 PR을 열어야 한다면 stacked branch를 사용할 수
있습니다. 이 경우 각 PR의 base를 바로 앞 branch로 설정하고, 선행 PR merge 후
`main`으로 rebase하여 base를 변경합니다.

## Tracking issue checklist

원격 저장소 생성 후 아래 내용을 `Mobile publisher delivery roadmap` Issue로 등록하고
pin합니다.

```text
- [x] MOB-00 Repository hygiene
- [ ] MOB-01 CI quality gates
- [ ] MOB-02 Runtime dependency ports
- [ ] MOB-03 Feature/UI architecture split
- [ ] MOB-04 Application store
- [ ] MOB-05 IndexedDB repositories
- [ ] MOB-07 Publisher session state machine
- [ ] MOB-06 Device authentication onboarding
- [ ] MOB-11 Atomic mobile UI
- [ ] MOB-08 Reconnect and handover
- [ ] MOB-09 Adaptive uplink quality
- [ ] MOB-10 Telemetry offline delivery
- [ ] MOB-12 Android viewport/browser E2E
- [ ] MOB-14 TURN/adverse networks
- [ ] MOB-13 Galaxy physical devices
- [ ] MOB-15 Backend mobile telemetry
- [ ] MOB-16 Device registration lifecycle
- [ ] MOB-17 Privacy-safe observability
- [ ] MOB-18 PWA update and recovery
- [ ] MOB-19 Production quality gates
- [ ] MOB-20 Release candidate and runbook
```
