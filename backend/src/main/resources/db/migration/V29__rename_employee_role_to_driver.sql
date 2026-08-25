-- Перейменування ролі EMPLOYEE → DRIVER у існуючих записах користувачів.

UPDATE users
SET role = 'DRIVER'
WHERE role = 'EMPLOYEE';
