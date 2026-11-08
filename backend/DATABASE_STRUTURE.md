\# Estructura de la Base de Datos



\## Descripción General



La aplicación utiliza una base de datos relacional para gestionar:



\- Alumnos

\- Profesores

\- Directores

\- Cursos

\- Certificados

\- Relaciones entre alumnos y cursos

\- Relaciones entre alumnos y certificados

\- Relaciones entre profesores y cursos

\- logs



\---



\# Diagrama Relacional



```text

ALUMNOS

│

├── alumnos\_cursos ─── CURSOS

│

└── alumnos\_certificados ─── CERTIFICADOS



PROFESORES

│

└── profesores\_cursos ─── CURSOS



DIRECTORES

```



\---



\# Tablas



\## 1. alumnos



Almacena la información de los estudiantes.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| nombre\_apellidos | TEXT | NOT NULL, UNIQUE |

| contrasena | TEXT | NOT NULL |

| nota\_media | REAL | |

| trabajos\_entregados | INTEGER | DEFAULT 0 |

| asistencia | REAL | CHECK(asistencia > 0) |



\---



\## 2. cursos



Almacena los cursos disponibles.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| nombre | TEXT | NOT NULL |

| materia | TEXT | NOT NULL |



\---



\## 3. alumnos\_cursos



Relación N:M entre alumnos y cursos.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| alumno\_id | INTEGER | FK → alumnos.id |

| curso\_id | INTEGER | FK → cursos.id |

| fecha\_inicio | TEXT | |

| fecha\_fin | TEXT | |

| nota | REAL | |



\### Claves Foráneas



\- alumno\_id → alumnos(id)

\- curso\_id → cursos(id)



\### Comportamiento



\- ON DELETE CASCADE



Si se elimina un alumno o curso, se eliminan automáticamente sus registros relacionados.



\---



\## 4. certificados



Almacena los certificados disponibles.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| nombre | TEXT | NOT NULL |



\---



\## 5. alumnos\_certificados



Relación N:M entre alumnos y certificados.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| alumno\_id | INTEGER | FK → alumnos.id |

| certificado\_id | INTEGER | FK → certificados.id |

| fecha\_obtencion | TEXT | |



\### Claves Foráneas



\- alumno\_id → alumnos(id)

\- certificado\_id → certificados(id)



\### Comportamiento



\- ON DELETE CASCADE



\---



\## 6. profesores



Almacena la información de los profesores.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| nombre\_apellidos | TEXT | NOT NULL, UNIQUE |

| telefono | TEXT | |

| contrasena | TEXT | NOT NULL |



\---



\## 7. profesores\_cursos



Relación N:M entre profesores y cursos.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| profesor\_id | INTEGER | FK → profesores.id |

| curso\_id | INTEGER | FK → cursos.id |



\### Claves Foráneas



\- profesor\_id → profesores(id)

\- curso\_id → cursos(id)



\### Comportamiento



\- ON DELETE CASCADE



\---



\## 8. directores



Almacena los administradores del sistema.



| Campo | Tipo | Restricciones |

|---------|---------|---------|

| id | INTEGER | PK, AUTOINCREMENT |

| nombre\_apellidos | TEXT | NOT NULL, UNIQUE |

| contrasena | TEXT | NOT NULL |



\---

## 9. deleted_logs

<br>
<br>
<br>

Almacena el historial de registros eliminados del sistema para permitir auditorías y posibles recuperaciones.

<br>
<br>
<br>

| Campo | Tipo | Restricciones |
<br>
|---------|---------|---------|
<br>
| id | BIGSERIAL | PK |
<br>
| fecha_eliminacion | TIMESTAMP | NOT NULL, DEFAULT NOW() |
<br>
| usuario_tipo | VARCHAR(20) | NOT NULL |
<br>
| usuario_id | INTEGER | NOT NULL |
<br>
| tabla_afectada | VARCHAR(50) | NOT NULL |
<br>
| registro_id | INTEGER | NOT NULL |
<br>
| datos_eliminados | JSONB | NOT NULL |
<br>
| motivo | TEXT | |

<br>
<br>
<br>

### Índices

<br>

| Índice | Columnas |
<br>
|---------|---------|
<br>
| idx_deleted_logs_fecha | fecha_eliminacion |
<br>
| idx_deleted_logs_tabla | tabla_afectada |
<br>
| idx_deleted_logs_usuario | usuario_tipo, usuario_id |

<br>
<br>
<br>

### Ejemplos de registros

<br>

- Eliminación de alumnos
- Eliminación de profesores
- Eliminación de cursos
- Eliminación de certificados
- Eliminación de relaciones entre alumnos y cursos

<br>
<br>
<br>

### Ejemplo de registro

<br>

| Campo | Valor |
<br>
|---------|---------|
<br>
| usuario_tipo | director |
<br>
| usuario_id | 1 |
<br>
| tabla_afectada | alumnos |
<br>
| registro_id | 25 |
<br>
| datos_eliminados | {"nombre_apellidos":"Juan García","nota_media":8.2} |
<br>
| motivo | Alumno dado de baja |

\---

\# Relaciones



\## alumnos ↔ cursos



Relación muchos a muchos mediante:



\- alumnos\_cursos



Un alumno puede estar matriculado en varios cursos y un curso puede tener varios alumnos.



\## alumnos ↔ certificados



Relación muchos a muchos mediante:



\- alumnos\_certificados



Un alumno puede tener múltiples certificados y un certificado puede pertenecer a múltiples alumnos.



\## profesores ↔ cursos



Relación muchos a muchos mediante:



\- profesores\_cursos



Un profesor puede impartir varios cursos y un curso puede ser impartido por varios profesores.



\---



\# Estadísticas del Modelo



| Tabla | Tipo |

|---------|---------|

| alumnos | Principal |

| cursos | Principal |

| certificados | Principal |

| profesores | Principal |

| directores | Principal |

| alumnos\_cursos | Intermedia |

| alumnos\_certificados | Intermedia |

| profesores\_cursos | Intermedia |



Total: 8 tablas

