# Roadmap

Este registro distingue el historial indicado por el proyecto de lo comprobable hoy en código. **Implementado técnicamente** no implica **validado manualmente** ni aprobación de reglas operacionales pendientes.

| Hito | Estado | Evidencia o siguiente paso |
| --- | --- | --- |
| Bloques 0–3.2 | Completados según el historial del proyecto | El repositorio conserva esquema, migraciones, autenticación y pruebas; no se infiere de ello validación manual completa. |
| Bloque 4.1: Gestión de Pisciculturas y Parámetros | Implementado técnicamente | Administración en Configuración; no es la toma rutinaria. |
| Módulo de Auditoría | Implementado técnicamente | Consulta en la ruta de Auditoría. |
| Bloque M.1: actualización de dependencias y seguridad | Completado según el historial del proyecto | Actualización reflejada en commits previos. |
| Bloque 4.2: Catálogos de Eventos | **Completado**, incluida la validación manual de la interfaz confirmada por el usuario | Cinco catálogos implementados; 61/61 pruebas de autenticación y 11/11 de base de datos aprobadas, con build, TypeScript, lint y migraciones al día según el cierre del bloque. |
| Toma operacional de Parámetros | Pendiente | Definir detalles abiertos en [Parámetros](../modulos/parametros.md) e implementar captura. |
| Ficha de Crianza | Pendiente | Derivar desde promedios diarios de PostgreSQL. |
| Eventos operacionales | Pendiente | Implementar captura y validar motivo/submotivo. |
| Reportes | Requisitos pendientes de revisión | Revisar Reportes Diarios y Unificados antes de diseñar o implementar. |

No se asignan números de bloque a las funcionalidades cuyo orden aún no está definido. La [documentación de módulos](../README.md#modulos) distingue requisitos confirmados y decisiones pendientes.
