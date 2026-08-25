-- Виправлення української назви Словаччини в довіднику країн
UPDATE country_reference
SET name_uk = 'Словаччина'
WHERE code_alpha2 = 'SK'
  AND name_uk IN ('Словакчина', 'Словакия');
