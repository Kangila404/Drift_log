-- 1) auth_identities 테이블 생성 (이미 있으면 무시)
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

-- 2) 기존 users → auth_identities 백필 (이미 백필된 행은 무시)
INSERT IGNORE INTO auth_identities
    (user_id, provider, provider_id, email, password, created_at, updated_at)
SELECT id, auth_type, email, email, password, created_at, updated_at
FROM users;