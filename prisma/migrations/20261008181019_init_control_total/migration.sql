-- CreateEnum
CREATE TYPE "sistema_parametros" AS ENUM ('HATCHERY', 'FRY', 'ONGROWING', 'SMOLT_1', 'SMOLT_2');

-- CreateEnum
CREATE TYPE "tipo_incidencia_camara" AS ENUM ('INTERMITENTE', 'FALLA');

-- CreateEnum
CREATE TYPE "turno_reporte" AS ENUM ('NOCHE', 'DIA', 'TARDE');

-- CreateTable
CREATE TABLE "piscicultura" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "nota_camaras" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "piscicultura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametro" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada_parametros" (
    "id" UUID NOT NULL,
    "piscicultura_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "responsable" TEXT,
    "configuracion" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jornada_parametros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muestra_parametro" (
    "id" UUID NOT NULL,
    "jornada_id" UUID NOT NULL,
    "sistema" "sistema_parametros" NOT NULL,
    "hora" TIME(0) NOT NULL,
    "flujo_abierto" BOOLEAN,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "muestra_parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicion_parametro" (
    "id" UUID NOT NULL,
    "muestra_id" UUID NOT NULL,
    "parametro_id" UUID NOT NULL,
    "punto" TEXT NOT NULL,
    "valor" DECIMAL(12,4) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medicion_parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camara" (
    "id" UUID NOT NULL,
    "piscicultura_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "camara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia_camara" (
    "id" UUID NOT NULL,
    "camara_id" UUID NOT NULL,
    "tipo" "tipo_incidencia_camara" NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3),
    "observacion" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "incidencia_camara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_diario" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "turno" "turno_reporte" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reporte_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_diario_piscicultura" (
    "id" UUID NOT NULL,
    "reporte_id" UUID NOT NULL,
    "piscicultura_id" UUID NOT NULL,
    "asistente" TEXT,
    "operario" TEXT,
    "novedades" TEXT,
    "fallas_alarmas" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reporte_diario_piscicultura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_unificado" (
    "id" UUID NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    "responsables" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reporte_unificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte_unificado_piscicultura" (
    "id" UUID NOT NULL,
    "reporte_id" UUID NOT NULL,
    "piscicultura_id" UUID NOT NULL,
    "cabana" TEXT,
    "tarde" TEXT,
    "noche" TEXT,
    "novedades" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reporte_unificado_piscicultura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_operacional" (
    "id" UUID NOT NULL,
    "piscicultura_id" UUID NOT NULL,
    "reporte_origen_id" UUID,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3),
    "personal" TEXT,
    "ocurrencias" INTEGER NOT NULL DEFAULT 1,
    "tipo" TEXT,
    "motivo_id" UUID,
    "submotivo_id" UUID,
    "categoria_id" UUID,
    "parametro_id" UUID,
    "condicion_id" UUID,
    "area_id" UUID,
    "valor" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evento_operacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_estanque" (
    "evento_id" UUID NOT NULL,
    "estanque" TEXT NOT NULL,

    CONSTRAINT "evento_estanque_pkey" PRIMARY KEY ("evento_id","estanque")
);

-- CreateTable
CREATE TABLE "categoria_evento" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_evento" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "condicion_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_operacional" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "area_operacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivo_evento" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "motivo_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submotivo_evento" (
    "id" UUID NOT NULL,
    "motivo_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submotivo_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_email" TEXT,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "antes" JSONB,
    "despues" JSONB,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "piscicultura_nombre_key" ON "piscicultura"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "piscicultura_codigo_key" ON "piscicultura"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "parametro_codigo_key" ON "parametro"("codigo");

-- CreateIndex
CREATE INDEX "jornada_parametros_fecha_idx" ON "jornada_parametros"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "jornada_parametros_piscicultura_id_fecha_key" ON "jornada_parametros"("piscicultura_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "muestra_parametro_jornada_id_sistema_hora_key" ON "muestra_parametro"("jornada_id", "sistema", "hora");

-- CreateIndex
CREATE UNIQUE INDEX "medicion_parametro_muestra_id_parametro_id_punto_key" ON "medicion_parametro"("muestra_id", "parametro_id", "punto");

-- CreateIndex
CREATE UNIQUE INDEX "camara_piscicultura_id_nombre_key" ON "camara"("piscicultura_id", "nombre");

-- CreateIndex
CREATE INDEX "incidencia_camara_camara_id_inicio_idx" ON "incidencia_camara"("camara_id", "inicio");

-- CreateIndex
CREATE INDEX "incidencia_camara_fin_idx" ON "incidencia_camara"("fin");

-- CreateIndex
CREATE UNIQUE INDEX "reporte_diario_fecha_turno_key" ON "reporte_diario"("fecha", "turno");

-- CreateIndex
CREATE INDEX "reporte_diario_piscicultura_piscicultura_id_idx" ON "reporte_diario_piscicultura"("piscicultura_id");

-- CreateIndex
CREATE UNIQUE INDEX "reporte_diario_piscicultura_reporte_id_piscicultura_id_key" ON "reporte_diario_piscicultura"("reporte_id", "piscicultura_id");

-- CreateIndex
CREATE UNIQUE INDEX "reporte_unificado_fecha_emision_key" ON "reporte_unificado"("fecha_emision");

-- CreateIndex
CREATE INDEX "reporte_unificado_piscicultura_piscicultura_id_idx" ON "reporte_unificado_piscicultura"("piscicultura_id");

-- CreateIndex
CREATE UNIQUE INDEX "reporte_unificado_piscicultura_reporte_id_piscicultura_id_key" ON "reporte_unificado_piscicultura"("reporte_id", "piscicultura_id");

-- CreateIndex
CREATE INDEX "evento_operacional_piscicultura_id_inicio_idx" ON "evento_operacional"("piscicultura_id", "inicio");

-- CreateIndex
CREATE INDEX "evento_operacional_fin_idx" ON "evento_operacional"("fin");

-- CreateIndex
CREATE INDEX "evento_operacional_reporte_origen_id_idx" ON "evento_operacional"("reporte_origen_id");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_evento_nombre_key" ON "categoria_evento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "condicion_evento_nombre_key" ON "condicion_evento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "area_operacional_nombre_key" ON "area_operacional"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "motivo_evento_nombre_key" ON "motivo_evento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "submotivo_evento_motivo_id_nombre_key" ON "submotivo_evento"("motivo_id", "nombre");

-- CreateIndex
CREATE INDEX "auditoria_fecha_idx" ON "auditoria"("fecha");

-- CreateIndex
CREATE INDEX "auditoria_modulo_entidad_idx" ON "auditoria"("modulo", "entidad");

-- AddForeignKey
ALTER TABLE "jornada_parametros" ADD CONSTRAINT "jornada_parametros_piscicultura_id_fkey" FOREIGN KEY ("piscicultura_id") REFERENCES "piscicultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "muestra_parametro" ADD CONSTRAINT "muestra_parametro_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada_parametros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicion_parametro" ADD CONSTRAINT "medicion_parametro_muestra_id_fkey" FOREIGN KEY ("muestra_id") REFERENCES "muestra_parametro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicion_parametro" ADD CONSTRAINT "medicion_parametro_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camara" ADD CONSTRAINT "camara_piscicultura_id_fkey" FOREIGN KEY ("piscicultura_id") REFERENCES "piscicultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_camara" ADD CONSTRAINT "incidencia_camara_camara_id_fkey" FOREIGN KEY ("camara_id") REFERENCES "camara"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_diario_piscicultura" ADD CONSTRAINT "reporte_diario_piscicultura_reporte_id_fkey" FOREIGN KEY ("reporte_id") REFERENCES "reporte_diario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_diario_piscicultura" ADD CONSTRAINT "reporte_diario_piscicultura_piscicultura_id_fkey" FOREIGN KEY ("piscicultura_id") REFERENCES "piscicultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_unificado_piscicultura" ADD CONSTRAINT "reporte_unificado_piscicultura_reporte_id_fkey" FOREIGN KEY ("reporte_id") REFERENCES "reporte_unificado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_unificado_piscicultura" ADD CONSTRAINT "reporte_unificado_piscicultura_piscicultura_id_fkey" FOREIGN KEY ("piscicultura_id") REFERENCES "piscicultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_piscicultura_id_fkey" FOREIGN KEY ("piscicultura_id") REFERENCES "piscicultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_reporte_origen_id_fkey" FOREIGN KEY ("reporte_origen_id") REFERENCES "reporte_unificado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_motivo_id_fkey" FOREIGN KEY ("motivo_id") REFERENCES "motivo_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_submotivo_id_fkey" FOREIGN KEY ("submotivo_id") REFERENCES "submotivo_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_parametro_id_fkey" FOREIGN KEY ("parametro_id") REFERENCES "parametro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_condicion_id_fkey" FOREIGN KEY ("condicion_id") REFERENCES "condicion_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operacional" ADD CONSTRAINT "evento_operacional_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area_operacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_estanque" ADD CONSTRAINT "evento_estanque_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento_operacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submotivo_evento" ADD CONSTRAINT "submotivo_evento_motivo_id_fkey" FOREIGN KEY ("motivo_id") REFERENCES "motivo_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Una cámara puede tener sólo una incidencia abierta; las cerradas conservan su historial.
CREATE UNIQUE INDEX "incidencia_camara_una_abierta"
ON "incidencia_camara" ("camara_id")
WHERE "fin" IS NULL;

-- Los intervalos cerrados deben tener duración positiva.
ALTER TABLE "incidencia_camara"
ADD CONSTRAINT "incidencia_camara_fin_posterior_inicio"
CHECK ("fin" IS NULL OR "fin" > "inicio");

ALTER TABLE "evento_operacional"
ADD CONSTRAINT "evento_operacional_fin_posterior_inicio"
CHECK ("fin" IS NULL OR "fin" > "inicio");
