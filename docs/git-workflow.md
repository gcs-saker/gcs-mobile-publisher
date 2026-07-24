# Git workflow

## 원칙

- 모든 코드는 Issue에 근거합니다.
- 모든 작업 단위는 검증 가능한 커밋으로 남깁니다.
- `main`은 항상 빌드 가능해야 하며 직접 개발하지 않습니다.
- 강제 push는 개인 작업 브랜치에서 rebase 직후에만 `--force-with-lease`로 허용합니다.
- `main`, 공유 브랜치, tag에는 강제 push를 금지합니다.

## 흐름

```text
Issue
  → feature branch
  → red test commit
  → implementation commit
  → refactor commit
  → PR
  → rebase main
  → CI/review
  → squash or rebase merge
  → milestone tag
```

테스트와 구현을 반드시 별도 커밋으로 나누라는 의미는 아닙니다. 커밋 하나가 독립적으로
빌드 가능해야 한다면 테스트와 최소 구현을 함께 커밋할 수 있습니다. 다만 커밋 메시지와
diff에서 한 가지 의도가 명확해야 합니다.

## 브랜치

| 목적 | 형식 |
|---|---|
| 기능 | `feat/issue-12-adaptive-quality` |
| 버그 | `fix/issue-25-reconnect-loop` |
| 리팩터링 | `refactor/issue-8-publisher-runtime` |
| 테스트 | `test/issue-31-android-matrix` |
| 릴리스 | `release/v0.2.0` |

장기 브랜치를 만들지 않습니다. 한 PR이 400줄 이상의 의미 있는 변경을 포함하면 Issue와
PR을 더 작은 수직 단위로 나누는 것을 우선 검토합니다.

## Rebase와 merge

작업 중 최신 `main` 반영:

```bash
git fetch origin
git rebase origin/main
```

- 개인 브랜치: rebase 허용
- 여러 사람이 공유하는 브랜치: 합의 없이 rebase 금지
- 일반 PR: squash merge
- 단계별 커밋이 각각 운영·감사 가치가 있는 PR: rebase merge
- 릴리스 브랜치 역병합: merge commit 허용

## Release와 tag

Tag는 Issue milestone 완료, 전체 테스트 통과, 배포 가능 artifact 확인 후 생성합니다.
버전은 Semantic Versioning을 사용합니다.

| Tag | 기준 |
|---|---|
| `v0.1.0` | 모바일 UI, WHIP, 센서, 재연결 MVP |
| `v0.2.0` | Android 실기기·네트워크 매트릭스 통과 |
| `v0.3.0` | 서버 텔레메트리·장비 인증 통합 |
| `v1.0.0-rc.1` | 운영 배포 후보 |
| `v1.0.0` | 운영 승인 완료 |

Tag에 대응하는 GitHub Release에는 변경점, 마이그레이션, 알려진 제한, 검증 기기를
기록합니다.
