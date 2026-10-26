-- A failed index/constraint exposes preexisting invalid rows without changing them.
-- Inspect and repair those rows before applying; never alter an applied migration.
BEGIN;
CREATE UNIQUE INDEX "categoria_evento_nombre_normalizado_key" ON "categoria_evento"
  (lower(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));
CREATE UNIQUE INDEX "condicion_evento_nombre_normalizado_key" ON "condicion_evento"
  (lower(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));
CREATE UNIQUE INDEX "area_operacional_nombre_normalizado_key" ON "area_operacional"
  (lower(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));
CREATE UNIQUE INDEX "motivo_evento_nombre_normalizado_key" ON "motivo_evento"
  (lower(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));
CREATE UNIQUE INDEX "submotivo_evento_motivo_nombre_normalizado_key" ON "submotivo_evento"
  ("motivo_id", lower(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));

ALTER TABLE "categoria_evento" ADD CONSTRAINT "categoria_evento_campos_validos"
  CHECK ("orden" >= 0 AND char_length(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))) BETWEEN 1 AND 120);
ALTER TABLE "condicion_evento" ADD CONSTRAINT "condicion_evento_campos_validos"
  CHECK ("orden" >= 0 AND char_length(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))) BETWEEN 1 AND 120);
ALTER TABLE "area_operacional" ADD CONSTRAINT "area_operacional_campos_validos"
  CHECK ("orden" >= 0 AND char_length(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))) BETWEEN 1 AND 120);
ALTER TABLE "motivo_evento" ADD CONSTRAINT "motivo_evento_campos_validos"
  CHECK ("orden" >= 0 AND char_length(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))) BETWEEN 1 AND 120);
ALTER TABLE "submotivo_evento" ADD CONSTRAINT "submotivo_evento_campos_validos"
  CHECK ("orden" >= 0 AND char_length(btrim(regexp_replace("nombre", U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))) BETWEEN 1 AND 120);
COMMIT;
