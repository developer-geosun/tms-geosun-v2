-- Прибрати AI-стек фрахту (текстові сценарії Gemini/Vertex і результати розрахунків).
-- Числові сценарії (freight_numeric_scenarios) та cost calculations не чіпаємо.

DROP TABLE IF EXISTS freight_ai_calculations;
DROP TABLE IF EXISTS freight_calculation_scenarios;
