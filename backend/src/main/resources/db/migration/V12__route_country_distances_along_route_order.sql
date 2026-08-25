-- Порядок країн уздовж маршруту (для відображення послідовності, а не алфавіту).
ALTER TABLE route_country_distances
    ADD COLUMN along_route_order INT NOT NULL DEFAULT 0 AFTER country_code;
