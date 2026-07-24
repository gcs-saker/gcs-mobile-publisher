## 연결 Issue

Closes #

## 사용자 결과

이 PR이 사용자 또는 운영자에게 제공하는 결과를 작성합니다.

## 변경 범위

- 

## 아키텍처

- [ ] 기능 로직 `.ts`와 UI `.tsx`가 분리되어 있다.
- [ ] 외부 의존성은 interface/port 뒤에서 주입된다.
- [ ] UI는 브라우저 API나 HTTP를 직접 호출하지 않는다.
- [ ] 재사용 가능한 UI는 Atomic 계층에 배치했다.
- [ ] 새 확장은 기존 정책 수정이 아니라 구현 추가를 우선했다.

## TDD 및 검증

- [ ] 실패 테스트를 먼저 정의했다.
- [ ] `pnpm run typecheck`
- [ ] `pnpm test`
- [ ] `pnpm run build`
- [ ] 대상 Android viewport/실기기 검증

검증 결과:

```text
여기에 결과를 붙여 넣습니다.
```

## 데이터와 보안

- [ ] access token, GPS 원문, 인증 정보가 로그에 포함되지 않는다.
- [ ] 저장소 선택이 `docs/frontend-architecture.md` 원칙을 따른다.
- [ ] API/DB 변경 시 하위 호환성과 마이그레이션을 설명했다.

## 배포 및 롤백

배포 순서, feature flag, 롤백 방법을 작성합니다.

## 커밋과 병합

- [ ] 커밋마다 하나의 논리적 작업 단위만 포함한다.
- [ ] 최신 `main`에 rebase했다.
- [ ] squash/rebase/merge 전략을 선택하고 이유를 확인했다.
