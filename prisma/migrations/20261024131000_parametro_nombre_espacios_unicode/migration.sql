-- Alinea el índice con los espacios Unicode que normaliza JavaScript /\s+/u.
-- U& evita caracteres invisibles en el archivo SQL. btrim después de reemplazar
-- cubre también espacios Unicode al inicio o final del nombre.
BEGIN;
DROP INDEX "parametro_nombre_normalizado_key";
CREATE UNIQUE INDEX "parametro_nombre_normalizado_key"
ON "parametro" (lower(btrim(regexp_replace("nombre",
  U&'[[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]+', ' ', 'g'))));
COMMIT;
