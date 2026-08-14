# Codex 기록 운영 반입 준비

현재 Codex 기록은 개발 OIDC의 `local-user`가 소유한 로컬 S3/MinIO
workspace에 있습니다. 운영에서 사용하려면 운영 Beat Google OIDC 로그인으로
생성된 동일 사용자의 앱 식별자에 별도로 반입해야 합니다. 로컬 workspace를
운영 bucket에 복사해 소유권을 우회하지 않습니다.

## 사전 검토 리포트

먼저 로컬 기록을 변경하지 않는 점검을 실행합니다.

```bash
pnpm exec dotenv -e .env.localhost -- \
  pnpm exec tsx scripts/codex-production-review.ts \
  --output /private/tmp/codex-production-review.md
```

기계 판독용 JSON이 필요하면 `--format json`을 사용합니다. 리포트에는 대화
원문을 넣지 않고 인벤토리, 메모리 상태, 학습 데이터셋 상태, 자동 민감정보
패턴 탐지 수, 운영 반입 차단 사유를 기록합니다. 탐지된 경우에는 원문 대신
검토할 대화 제목과 메시지 id만 표시합니다.

운영 user id를 확인한 뒤에는 다음처럼 리포트에만 주입할 수 있습니다.

```bash
pnpm exec dotenv -e .env.localhost -- \
  pnpm exec tsx scripts/codex-production-review.ts \
  --production-user-id "<Beat 앱 내부 user id>" \
  --output /private/tmp/codex-production-review.md
```

## 운영 반입 전 확인 순서

1. 리포트에서 운영 Beat user id를 지정합니다. 이메일이나 access token을
   리포트에 넣지 말고, Google OIDC 로그인 후 애플리케이션이 발급한 안정적인
   내부 user id만 사용합니다.
2. `candidate` 메모리를 하나씩 검토하고 승인 또는 거절합니다. 승인된 메모리만
   대화 검색 컨텍스트에 들어갑니다.
3. 자동 민감정보 탐지 결과와 원문을 수동 검토합니다. 개인 전용 workspace에
   보관하는 경우 원문을 그대로 import할 수 있지만, bucket 암호화·접근 정책·
   백업 범위를 확인합니다.
4. 운영 S3 bucket의 버전 관리, 암호화, 접근 정책, 보존 정책을 확인합니다.
5. 운영 OIDC 로그인과 개인 workspace 소유권을 확인한 뒤에만 import를
   실행합니다. import는 대화별 idempotency key를 사용하므로 재실행할 수
   있습니다.
6. 운영에서 helpful 피드백을 충분히 모은 뒤에만 학습 데이터셋을 생성합니다.
   원본 Codex transcript 전체를 바로 fine-tuning하지 않습니다.

## 운영 반입 명령의 원칙

운영 반입과 배포는 로컬에서 실행하지 않고 보호된 GitHub Actions에서 실행합니다.
Action은 다음 값을 protected Environment에서 주입해야 합니다.

- 운영 S3 bucket과 endpoint 설정
- 운영 Beat OIDC가 매핑한 내부 user id
- 운영 workspace id 또는 최초 workspace 생성 정책

토큰, client secret, 비밀번호, 전체 dotenv 내용은 로그나 대화에 출력하지
않습니다. 개인 workspace 데이터는 원문을 포함할 수 있지만, 운영 import
Action은 해당 workspace가 요청 사용자에게만 접근 가능한지 확인한 뒤 실행해야
합니다. 운영 import Action이 추가되기 전까지는 로컬에서 생성한 리포트만
검토하고, 운영 bucket에는 아무것도 쓰지 않습니다.
