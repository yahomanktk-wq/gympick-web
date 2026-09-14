# gympick-web

GymPick 앱에 설치 없이 접속해서, 특정 헬스장의 보유 머신 목록을 웹에서 바로
볼 수 있게 해주는 폴백 페이지. 매니저가 홍보 채널에 `https://gympick.app/gym/{헬스장ID}`
링크를 올려두면, 손님이 앱 설치 없이 그 링크만 눌러서 보유 머신을 확인할 수 있다.

빌드 도구 없이 순수 HTML/CSS/JS로만 구성 (Vercel에 그대로 정적 배포).

## 폴더 구성

- `index.html` — 페이지 뼈대
- `styles.css` — 스타일 (앱과 동일 톤: 흰 배경, 블랙+라임그린)
- `app.js` — URL에서 헬스장 ID를 읽어 데이터를 불러오고 렌더링
- `supabase.js` — Supabase REST 조회 (읽기 전용, anon 키만 사용)
- `muscles.js` — 타겟부위 표시 규칙 (앱과 동일: CHEST/BACK/LEGS/SHOULDERS/ARMS/GLUTES/OTHER)
- `config.js` — Supabase URL/anon 키 (공개용 키, service_role 아님)
- `vercel.json` — `/gym/:gymId` 경로를 `index.html`로 라우팅

## 로컬에서 확인하기

Node가 설치되어 있다면:

```
npx serve .
```

그 다음 브라우저에서 `http://localhost:3000/gym/g01`처럼 실제 헬스장 ID로 접속해서 확인.
(`g01`은 예시 — 실제 존재하는 gym id로 바꿔서 테스트)

## GitHub에 올리기

이 폴더를 새 저장소로 만들어서 push:

```
git init
git add .
git commit -m "gympick-web 초기 버전 — 헬스장 보유 머신 웹 폴백 페이지"
git branch -M main
git remote add origin https://github.com/yahomanktk-wq/gympick-web.git
git push -u origin main
```

(위 remote 주소는 GitHub에서 `gympick-web`이라는 이름으로 새 저장소를 먼저
만든 다음, 거기서 복사해온 주소로 바꿔서 실행할 것 — 계정: yahomanktk-wq)

## Vercel 배포

1. vercel.com 접속 → "Continue with GitHub"로 가입/로그인
2. "Add New..." → "Project" → 방금 만든 `gympick-web` 저장소 Import
3. Framework Preset: **Other** (빌드 명령 없음, 그대로 Deploy)
4. 배포 완료되면 기본 제공되는 `xxx.vercel.app` 주소로 먼저 테스트:
   `https://xxx.vercel.app/gym/실제gymID`
5. 잘 보이면 Vercel 프로젝트 → Settings → Domains → `gympick.app` 추가
   → 화면에 안내되는 DNS 레코드(A 또는 CNAME)를 Namecheap의
   Advanced DNS 설정에 그대로 입력
6. DNS 전파 후 `https://gympick.app/gym/실제gymID`로 접속 확인

## 다음 단계 (아직 미착수)

이 웹페이지 자체는 지금 상태로 이미 "링크 → 보유 머신 목록" 목적을 만족한다.
"앱이 설치돼 있으면 앱으로 바로 열리게" 하려면(유니버설 링크), 아래 작업이
추가로 필요함 — 별도로 진행 예정:

- Apple Developer Team ID / Android 앱 서명 SHA-256 지문 확보
- `.well-known/apple-app-site-association`, `.well-known/assetlinks.json`을
  이 프로젝트에 추가해서 `gympick.app`에 함께 호스팅
- GymPick 앱(React Native) 쪽 app.json/eas.json에 Associated Domains /
  intentFilters 설정 추가 + React Navigation linking 설정
- 새 빌드 제작 및 앱스토어/플레이스토어 재제출
