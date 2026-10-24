-- Verificado antes de aplicar: no hay nombres normalizados duplicados en parametro.
-- La restricción protege escrituras concurrentes y conserva las filas y UUID existentes.
CREATE UNIQUE INDEX "parametro_nombre_normalizado_key"
ON "parametro" (lower(regexp_replace(btrim("nombre"), '[[:space:]]+', ' ', 'g')));
