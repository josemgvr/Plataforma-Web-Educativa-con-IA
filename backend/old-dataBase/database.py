import sqlite3
import os

# Ruta fija a la base de datos para evitar problemas de directorio
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "estudiantes.db")

def get_connection():
    """Crea y retorna una conexión a la base de datos SQLite con claves foráneas activadas."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Crea las tablas en la base de datos SQLite si no existen."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Tabla de alumnos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alumnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_apellidos TEXT NOT NULL UNIQUE,
        contrasena TEXT NOT NULL,
        nota_media REAL,
        trabajos_entregados INTEGER DEFAULT 0,
        asistencia REAL CHECK (asistencia > 0)
    );
    """)

    # 2. Tabla de cursos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cursos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        materia TEXT NOT NULL
    );
    """)

    # 3. Tabla de relación alumnos-cursos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alumnos_cursos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alumno_id INTEGER NOT NULL,
        curso_id INTEGER NOT NULL,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        nota REAL,
        FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
        FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
    );
    """)

    # 4. Tabla de certificados
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS certificados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL
    );
    """)

    # 5. Tabla de relación alumnos-certificados
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alumnos_certificados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alumno_id INTEGER NOT NULL,
        certificado_id INTEGER NOT NULL,
        fecha_obtencion TEXT,
        FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
        FOREIGN KEY (certificado_id) REFERENCES certificados(id) ON DELETE CASCADE
    );
    """)

    # 6. Tabla de profesores
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profesores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_apellidos TEXT NOT NULL UNIQUE,
        telefono TEXT,
        contrasena TEXT NOT NULL
    );
    """)

    # 7. Tabla de relación profesores-cursos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profesores_cursos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profesor_id INTEGER NOT NULL,
        curso_id INTEGER NOT NULL,
        FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
        FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
    );
    """)

    # 8. Tabla de directores (administradores)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS directores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_apellidos TEXT NOT NULL UNIQUE,
        contrasena TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Base de datos y tablas inicializadas correctamente.")
