---
name: commit-push-pr
description: 변경사항을 커밋하고 GitHub에 푸시한 후 PR을 생성합니다. 한국어 커밋 메시지를 사용하며, 원격 저장소가 없으면 자동으로 생성합니다.
allowed-tools: Bash(git *), Bash(gh *)
---

# Commit, Push, and PR Creation

## 개요

이 Skill은 다음 워크플로우를 자동화합니다:
1. 모든 변경사항 스테이징
2. 한국어 커밋 메시지 작성 및 커밋
3. GitHub 원격 저장소 확인/생성
4. feature 브랜치 생성 및 푸시
5. PR 생성

## 사용 방법

```
/commit-push-pr
```

또는 다음과 같이 요청:
- "커밋하고 PR 만들어줘"
- "변경사항 푸시하고 PR 생성해줘"

## 워크플로우 상세

### 1단계: 변경사항 확인

```bash
git status
git diff --stat HEAD
git log --oneline -5
```

### 2단계: 모든 파일 스테이징

```bash
git add -A
```

### 3단계: 커밋 메시지 작성

**형식**: Conventional Commits (한국어)
```
<type>: <한국어 제목>

## 섹션 1
- 상세 내용 1
- 상세 내용 2

## 섹션 2
- 상세 내용
```

**타입**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `perf`: 성능 개선
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 변경

**중요**: 커밋 메시지에 AI/Claude/LLM 관련 언급 금지

### 4단계: 원격 저장소 확인

```bash
git remote -v
```

원격 저장소가 없으면 생성:
```bash
gh repo create <repo-name> --private --source=. --push
```

### 5단계: feature 브랜치 생성 및 PR

main 브랜치에서 직접 작업한 경우:

```bash
# 현재 커밋 해시 저장
CURRENT_COMMIT=$(git rev-parse HEAD)
# 이전 커밋(base) 해시
BASE_COMMIT=$(git rev-parse HEAD~1)

# feature 브랜치 생성
git checkout -b feature/<적절한-이름> $BASE_COMMIT
git cherry-pick $CURRENT_COMMIT
git push -u origin feature/<적절한-이름>

# main 리셋 (PR 타겟을 위해)
git checkout main
git reset --hard $BASE_COMMIT
git push --force origin main
```

### 6단계: PR 생성

```bash
gh pr create \
  --base main \
  --head feature/<브랜치명> \
  --title "<커밋 제목>" \
  --body "$(cat <<'EOF'
## 요약
- 변경사항 요약 1
- 변경사항 요약 2

## 테스트 계획
- [ ] 테스트 항목 1
- [ ] 테스트 항목 2
EOF
)"
```

## 출력

작업 완료 후 다음 정보 제공:
- 커밋 메시지 요약
- 변경된 파일 수
- PR URL

## 주의사항

1. **커밋 메시지**: 반드시 한국어로 작성
2. **AI 언급 금지**: 커밋 메시지에 Claude, AI, LLM 등 언급하지 않음
3. **브랜치 전략**: main 보호를 위해 feature 브랜치에서 PR 생성
4. **원격 저장소**: 없으면 private으로 자동 생성
