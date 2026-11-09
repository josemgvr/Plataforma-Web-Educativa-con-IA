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
  - Drawer de chat con IA disponible para **profesores** y **directores**.
  - Diseño responsive y limpio con HTML5 y CSS3 puro.

- **Backend (`FastAPI`)**:
  - Servidor API en **Python** con **FastAPI** (`backend/main.py`).
  - Endpoints REST para autenticación (`/login`), gestión de alumnos, profesores, cursos y certificados.
  - Validación de esquemas con Pydantic y servicio de archivos estáticos del frontend.
  - **Chatbot con IA**: endpoint `POST /chat` que combina Google Gemini, recuperación de documentación (RAG) y consulta de datos académicos según el rol del usuario.

- **Base de datos (`PostgreSQL`)**:
  - Base de datos relacional alojada en **Supabase** y gestionada mediante **PostgreSQL**.
  - Integración del backend con PostgreSQL utilizando **psycopg**.
  - Tablas para alumnos, profesores, directores, cursos, certificados y tablas intermedias para la gestión de matrículas, asignaciones y calificaciones.
  - Tabla `chunks` con extensión **pgvector** para almacenar los fragmentos de documentación y sus embeddings (usada por el RAG).
  - Migración completa de los datos desde `SQLite` a `PostgreSQL` para mejorar la escalabilidad, concurrencia y preparación para despliegue en producción.

- ** Chatbot con IA (RAG + datos académicos)
  - El chatbot, integrado en las vistas de **profesor** y **director**, responde en español combinando tres fuentes:

  - **Google Gemini** como modelo de lenguaje (`gemini_service.py`).
  - **RAG sobre documentación**: recupera fragmentos relevantes de los archivos `.md` de `backend/documentos` (por ejemplo, dudas sobre cursos, certificados o uso de la plataforma). Usa embeddings locales con `sentence-transformers` y búsqueda vectorial con **pgvector** (`rag_service.py` y `local_embeddings.py`).
  - **Datos de la base de datos según el rol**:
   -  **Profesor**: métricas de sus cursos (alumnos, media, nota máxima/mínima y aprobados) y las mejores y peores notas de cada curso.
  -  **Director**: resumen de todo el centro (totales, media global, cursos, alumnos, profesores y certificados).
  -  **Alumnos**: no tienen acceso al chatbot (el backend lo bloquea).

  - La documentación es un complemento: si no hay fragmentos relevantes, el chatbot responde igualmente con conocimientos generales de educación y pedagogía. El backend verifica las credenciales del usuario y filtra los datos antes de enviarlos al modelo, que nunca consulta la base de datos directamente.

---

## 📂 Organización del Proyecto

```text
Proyecto/
├── backend/
│   ├──	old-dataBase/	    # Antigua implementacion en SQlite local
│   ├── documentos/         # Documentación .md usada por el RAG del chatbot
│   ├── cargar_documentos.py # Indexa los .md en la tabla chunks (pgvector)
│   ├── database.py         # Conexión PostgreSQL (Supabase)
│   ├── gemini_service.py   # Cliente de Gemini, prompts y generación de respuestas
│   ├── local_embeddings.py # Modelo local de embeddings para el RAG
│   ├── main.py             # API FastAPI y servicio del frontend
│   ├── rag_service.py      # Búsqueda vectorial y flujo del RAG
│   └── requirements.txt    # Requisitos de Phyton
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

### 4. Indexar la documentación del RAG
```bash
python -m backend.cargar_documentos
```
Recorre `backend/documentos`, genera los embeddings locales y actualiza la tabla `chunks` de pgvector. Hay que repetirlo cuando se añadan o modifiquen los `.md`. Sin este paso el chatbot sigue funcionando, pero sin apoyarse en la documentación.

> El chatbot necesita `GEMINI_API_KEY` configurada en `backend/.env` (además de `DATABASE_URL` para la base de datos).
