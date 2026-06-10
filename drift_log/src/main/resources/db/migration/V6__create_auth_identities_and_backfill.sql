-- 1) auth_identities 테이블 생성 (멱등)
CREATE TABLE IF NOT EXISTS auth_identities (
                                               id          BIGINT       NOT NULL AUTO_INCREMENT,
                                               user_id     BIGINT       NOT NULL,
                                               provider    ENUM('LOCAL','GOOGLE','KAKAO') NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NULL,
    password    VARCHAR(255) NULL,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_auth_provider UNIQUE (provider, provider_id),
    CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users (id)
    );

-- 2) users에 auth_type 컬럼이 있을 때만 백필 (로컬은 이미 DROP돼서 스킵)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'auth_type'
);

SET @sql = IF(@col_exists > 0,
    'INSERT IGNORE INTO auth_identities (user_id, provider, provider_id, email, password, created_at, updated_at)
     SELECT id, auth_type, email, email, password, created_at, updated_at FROM users',
    'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;