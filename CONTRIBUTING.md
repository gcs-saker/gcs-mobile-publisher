# Contributing

이 저장소의 모든 변경은 Issue → Branch → TDD Commit → Pull Request → Rebase/Merge →
Tag 순서로 관리합니다.

## 작업 시작

1. 작업에 대응하는 Issue가 있는지 확인합니다.
2. Issue에 완료 조건과 테스트 계획이 없으면 구현을 시작하지 않습니다.
3. 최신 `main`에서 작업 브랜치를 만듭니다.

```bash
git switch main
git pull --ff-only
git switch -c feat/issue-<number>-<short-description>
```

브랜치 prefix는 `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/` 중 하나를
사용합니다.

## TDD와 커밋

1. 실패하는 테스트를 먼저 작성합니다.
2. 최소 구현으로 테스트를 통과시킵니다.
3. 중복을 제거하고 OCP를 위반하지 않도록 리팩터링합니다.
4. 전체 검증을 수행합니다.
5. 하나의 논리적 작업 단위만 커밋합니다.

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

커밋은 Conventional Commits 형식을 사용합니다.

```text
test: define reconnect policy behavior
feat: add injectable reconnect policy
refactor: extract publisher status presentation
```

## Pull Request

- 하나의 PR은 하나의 사용자 가치 또는 하나의 아키텍처 목적만 다룹니다.
- PR 본문에 연결 Issue, 변경 이유, 테스트 증거, 롤백 방법을 기록합니다.
- 관련 없는 리팩터링을 같은 PR에 포함하지 않습니다.
- 리뷰 전 `main`을 rebase하고 전체 검증을 다시 실행합니다.
- 일반 기능 PR은 squash merge를 기본값으로 사용합니다.
- 의미 있는 개별 커밋 이력을 보존해야 하는 릴리스·마이그레이션 PR은 rebase merge를
  사용할 수 있습니다.
- merge commit은 여러 릴리스 브랜치를 명시적으로 합칠 때만 사용합니다.

## Tag

- 동작 가능한 MVP: `v0.1.0`
- 현장 실기기 검증 완료: `v0.2.0`
- 백엔드·인증 통합 완료: `v0.3.0`
- 운영 출시 후보: `v1.0.0-rc.1`
- 운영 출시: `v1.0.0`

Tag는 검증을 통과한 `main` 커밋에 annotated tag로 생성합니다.

```bash
git tag -a v0.1.0 -m "Android publisher MVP"
git push origin v0.1.0
```

세부 정책은 [`docs/git-workflow.md`](docs/git-workflow.md)와
[`docs/frontend-architecture.md`](docs/frontend-architecture.md)를 따릅니다.
