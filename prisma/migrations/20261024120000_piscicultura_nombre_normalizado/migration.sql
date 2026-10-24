-- Revisar duplicados antes de aplicar: SELECT lower(regexp_replace(btrim(nombre), '[[:space:]]+', ' ', 'g')), count(*)
-- FROM piscicultura GROUP BY 1 HAVING count(*) > 1;
-- Conserva UUID y datos; una colisión preexistente hará fallar la migración sin alterar filas.
CREATE UNIQUE INDEX "piscicultura_nombre_normalizado_key"
ON "piscicultura" (lower(regexp_replace(btrim("nombre"), '[[:space:]]+', ' ', 'g')));
