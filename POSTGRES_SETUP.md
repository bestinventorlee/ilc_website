# PostgreSQL 서버 세팅 가이드

## 1) PostgreSQL 사용자/DB 생성

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE ilc_db;
CREATE USER ilc_user WITH ENCRYPTED PASSWORD 'change-this-password';
GRANT ALL PRIVILEGES ON DATABASE ilc_db TO ilc_user;
\c ilc_db
GRANT ALL ON SCHEMA public TO ilc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ilc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ilc_user;
```

## 2) 서버 환경변수 설정

`.env` 파일 예시:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=at-least-32-char-strong-secret
REFRESH_TOKEN_SECRET=at-least-32-char-strong-refresh-secret

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ilc_db
DB_USER=ilc_user
DB_PASSWORD=change-this-password
```

## 3) JSON 데이터 1회 이관

```bash
npm run db:migrate-json
```

## 4) 백업/복구

```bash
pg_dump -U ilc_user -h 127.0.0.1 ilc_db > ilc_db_backup.sql
psql -U ilc_user -h 127.0.0.1 ilc_db < ilc_db_backup.sql
```
