-- Datos maestros iniciales. Repetir este archivo no borra filas ni cambia UUID.
-- Los catálogos de eventos sólo incluyen los defaults verificables en
-- assets/js/legacy.js; las opciones adicionales residen en Firestore y no
-- están disponibles en este repositorio.
BEGIN;

INSERT INTO "piscicultura" ("id", "codigo", "nombre", "orden", "activa", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'SANTA_JUANA', 'Santa Juana', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RAHUE', 'Rahue', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PCC', 'PCC', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TRAFUN', 'Trafun', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LIQUINE', 'Liquiñe', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOS_CIPRESES', 'Los Cipreses', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COLLIN', 'Collin', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LICAN', 'Lican', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'RIO_PESCADO', 'Río Pescado', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "parametro" ("id", "codigo", "nombre", "unidad", "orden", "activo", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'TEMP', 'Temperatura', '°C', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PH', 'pH', NULL, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'O2', 'Oxígeno', 'mg/L', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SALINIDAD', 'Salinidad', 'ppt', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CO2', 'CO2', 'mg/L', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "categoria_evento" ("id", "nombre", "orden", "activa", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'Sensores', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "condicion_evento" ("id", "nombre", "orden", "activa", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'Alto', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "area_operacional" ("id", "nombre", "orden", "activa", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'Hatchery', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;

COMMIT;
