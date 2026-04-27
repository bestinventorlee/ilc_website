CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE users
SET username = CONCAT('user', id)
WHERE username IS NULL OR username = '';

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (username);

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_balance INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(120);

CREATE TABLE IF NOT EXISTS token_transfers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(120) NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL DEFAULT 'ILC',
  tx_hash VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  sent_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transfers_user_id ON token_transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_status ON token_transfers (status);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token VARCHAR(255) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

ALTER TABLE refresh_tokens
  ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_number VARCHAR(80) NOT NULL UNIQUE,
  membership_type VARCHAR(120) NOT NULL,
  join_date DATE NOT NULL,
  expiry_date DATE,
  benefits TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'expired', 'suspended')),
  price INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships (status);

CREATE TABLE IF NOT EXISTS membership_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  number_format VARCHAR(120) NOT NULL DEFAULT 'MEM-{YYYY}-{SEQ3}',
  default_duration_days INTEGER,
  benefits TEXT[] NOT NULL DEFAULT '{}',
  price INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE membership_types
  ADD COLUMN IF NOT EXISTS number_format VARCHAR(120) NOT NULL DEFAULT 'MEM-{YYYY}-{SEQ3}';

CREATE INDEX IF NOT EXISTS idx_membership_types_name ON membership_types (name);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(120) NOT NULL,
  author_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('notice', 'community')),
  category VARCHAR(120),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_posts_type ON posts (type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);

CREATE TABLE IF NOT EXISTS library_items (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(120) NOT NULL,
  file_type VARCHAR(40) NOT NULL,
  file_size BIGINT NOT NULL,
  download_url TEXT,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  download_count INTEGER NOT NULL DEFAULT 0,
  author VARCHAR(120),
  uploader_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_items_category ON library_items (category);

CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts (status);

CREATE TABLE IF NOT EXISTS site_contents (
  key VARCHAR(120) PRIMARY KEY,
  content JSONB NOT NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
