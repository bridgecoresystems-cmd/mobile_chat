Нужно 4 терминала. По порядку:

  Терминал 1 — БД (один раз, оставить работать)

  cd "/home/batyr/projects/mobile_ chat"
  docker compose up postgres redis -d
  Поднимает Postgres (порт 5434) и Redis (порт 6381).

  ---
  Терминал 2 — Rust движок (новый бинарник)

  cd /home/batyr/projects/framework
  DATABASE_URL=postgres://chat_user:chat_pass@127.0.0.1:5434/chat_db \
  REDIS_URL=redis://127.0.0.1:6381 \
  JWT_SECRET=dev-secret-change-in-production \
  RUST_LOG=turbo_chat_engine=info \
  ./target/release/turbo_chat_engine

  ---
  Терминал 3 — BFF (уже запущен)

  cd "/home/batyr/projects/mobile_ chat/packages/backend"
  bun run dev

  ---
  Терминал 4 — Фронт (уже запущен)

  cd "/home/batyr/projects/mobile_ chat/packages/mobile"
  bun run dev
  # → http://localhost:5173

  ---
  Тестирование двух пользователей

  ▎ Важно: не используй два таба в одном браузере — у них общий localStorage, из-за этого auth.user.id у одного 
  ▎ перезаписывает другого → mine ломается.

  - Пользователь 1: Chrome → http://localhost:5173
  - Пользователь 2: Firefox (или Chrome в режиме инкогнито) → http://localhost:5173

  ---
  Capacitor (нативное устройство)

  Нужен только если тестируешь на реальном телефоне:
  cd "/home/batyr/projects/mobile_ chat/packages/mobile"
  bun run build
  npx cap sync
  npx cap run android   # или ios
  Для браузерного тестирования Capacitor не нужен — Vite достаточно.
