AVISO: Todos los nombre utilizados son inventados.
# 🏫 Registro de Estudiantes — Colegio Mayor Cibeles

Aplicación web fullstack diseñada para registrar, consultar y analizar la información académica de estudiantes (notas, cursos matriculados, asistencia y certificados) con control de acceso por roles (alumnos, profesores y directores).

Este proyecto es un ejercicio práctico para probar y aprender el desarrollo fullstack de principio a fin, integrando interfaz de usuario, API y persistencia de datos. Asimismo, durante su desarrollo se han utilizado herramientas de inteligencia artificial como Antigravity como asistencia para la programación y estructuración del código.

---

## 🛠️ Estructura y Tecnologías

El proyecto está organizado en una arquitectura desacoplada de tres capas:

- **Frontend (`React`)**:
  - Desarrollado con **React** y **Vite**, utilizando componentes funcionales y hooks para la gestión reactiva del estado.
  - Interfaz modular que incluye portal público institucional, modal de inicio de sesión con control de roles y panel privado del estudiante.
  - Diseño responsive y limpio con HTML5 y CSS3 puro.

- **Backend (`FastAPI`)**:
  - Servidor API en **Python** con **FastAPI** (`backend/main.py`).
  - Endpoints REST para autenticación (`/login`), gestión de alumnos, profesores, cursos y certificados.
  - Validación de esquemas con Pydantic y servicio de archivos estáticos del frontend.

- **Base de datos (`PostgreSQL`)**:
  - Base de datos relacional alojada en **Supabase** y gestionada mediante **PostgreSQL**.
  - Integración del backend con PostgreSQL utilizando **psycopg**.
  - Tablas para alumnos, profesores, directores, cursos, certificados y tablas intermedias para la gestión de matrículas, asignaciones y calificaciones.
  - Migración completa de los datos desde `SQLite` a `PostgreSQL` para mejorar la escalabilidad, concurrencia y preparación para despliegue en producción.

---

## 📂 Organización del Proyecto

```text
Proyecto/
├── backend/
│   ├──	old-dataBase/	    # Antigua implementacion en SQlite local
│   ├── database.py         # Conexión PostgreSQL (Supabase)
│   ├── main.py             # API FastAPI y servicio del frontend
│   └── requirements.text   # Requisitos de Phyton
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Componentes React y lógica de interfaz
│   │   └── main.jsx        # Punto de entrada de React
│   ├── index.html          # Plantilla HTML raíz
│   ├── styles.css          # Estilos globales y responsive
│   └── vite.config.js      # Configuración de Vite y proxy hacia la API
├── CREDENCIALES_PRUEBA.md  # Usuarios y claves de prueba
├── AGENTS.md               # Guía de convenciones y desarrollo
└── README.md               # Documentación general del proyecto
```

---

## 🚀 Puesta en Marcha

### 1. Iniciar el Backend (FastAPI)
```bash
uvicorn backend.main:app --reload
```
La aplicación web y la API estarán disponibles en `http://127.0.0.1:8000`.

### 2. Iniciar el Frontend en Desarrollo (React con Vite)
```bash
cd frontend
npm run dev
```
Acceso en `http://localhost:5173` (con redirección automática de peticiones a la API).

### 3. Compilar para Producción
```bash
cd frontend
npm run build
```
Genera la carpeta `frontend/dist`, servida automáticamente por el servidor FastAPI.
