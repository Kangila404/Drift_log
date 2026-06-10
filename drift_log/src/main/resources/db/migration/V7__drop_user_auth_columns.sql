SET @c = (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name='users' AND column_name='auth_type');
SET @s = IF(@c>0, 'ALTER TABLE users DROP COLUMN auth_type', 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name='users' AND column_name='email');
SET @s = IF(@c>0, 'ALTER TABLE users DROP COLUMN email', 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c = (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name='users' AND column_name='password');
SET @s = IF(@c>0, 'ALTER TABLE users DROP COLUMN password', 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;