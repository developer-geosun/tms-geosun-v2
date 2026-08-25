-- Додає бізнес-операції точки маршруту (LOADING / EXPORT_CUSTOMS / IMPORT_CUSTOMS / UNLOADING).
-- Зберігаємо як JSON-масив у TEXT-колонці (через Hibernate AttributeConverter); тип TEXT
-- сумісний як з MySQL, так і з тестовим H2 у MODE=MySQL.
ALTER TABLE route_points
  ADD COLUMN operations TEXT NULL AFTER point_type;

-- Сід-значення для існуючих маршрутів: START -> [LOADING], FINISH -> [UNLOADING];
-- STOP/BORDER лишаються з порожнім масивом (адміністратор/користувач дозаповнить при редагуванні).
UPDATE route_points
  SET operations = '["LOADING"]'
  WHERE point_type = 'START';

UPDATE route_points
  SET operations = '["UNLOADING"]'
  WHERE point_type = 'FINISH';

UPDATE route_points
  SET operations = '[]'
  WHERE point_type IN ('STOP', 'BORDER') AND operations IS NULL;
