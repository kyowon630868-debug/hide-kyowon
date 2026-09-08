# 배포

`.env` 에 Supabase 값이 있으면 `npm run build` 결과(`dist/`)에 그 값이 박혀서
`dist/` 만 어디든 올리면 바로 온라인 플레이 가능하다. (anon/publishable 키는 원래 클라에 노출되는 공개 키라 괜찮음)

## A. 가장 빠름 — Netlify Drop (계정 불필요, 1분)
```
npm run build
```
→ https://app.netlify.com/drop 열고 **`dist` 폴더를 브라우저에 드래그** → 즉시 URL 생성.
임시 URL이지만 팀에 공유해서 바로 테스트 가능.

## B. 영구 배포 — Vercel (추천, 계정 1회 로그인)
```
npx vercel login      # 브라우저로 GitHub/GitLab/이메일 로그인 (1회)
npx vercel --prod      # 배포. 프레임워크=Vite, output=dist 자동 감지
```
- 커스텀 도메인, 자동 재배포(깃 연결 시) 됨
- **깃 연결 방식**을 쓰면**: vercel.com 에서 저장소 import → Environment Variables 에
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가 (`.env` 는 깃에 없으므로)

## C. Cloudflare Pages
```
npm run build
npx wrangler pages deploy dist    # 1회 로그인 필요
```

---

## Supabase 쪽 확인
- Realtime 은 기본 켜짐 — 추가 설정 없음
- 프로젝트 무료 한도(2M realtime 메시지/월 등)는 **이 프로젝트 전용**. 다른 프로젝트와 공유 안 됨
- ⚠️ 무료 조직은 **활성 프로젝트 2개 제한** — 넘으면 안 쓰는 프로젝트가 일시정지됨(대시보드에서 재개 가능)
- 게임 일주일 안 하면 자동 일시정지될 수 있음 → 대시보드에서 "Restore" 누르면 됨
