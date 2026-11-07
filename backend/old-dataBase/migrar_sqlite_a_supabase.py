import sqlite3
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL")

sqlite_conn = sqlite3.connect("estudiantes.db")
sqlite_conn.row_factory = sqlite3.Row

pg_conn = psycopg.connect(DATABASE_URL)

sqlite_cursor = sqlite_conn.cursor()
pg_cursor = pg_conn.cursor()

TABLAS = [
    "alumnos",
    "cursos",
    "certificados",
    "profesores",
    "directores",
    "alumnos_cursos",
    "alumnos_certificados",
    "profesores_cursos"
]

for tabla in TABLAS:

    print(f"Migrando {tabla}...")

    sqlite_cursor.execute(f"SELECT * FROM {tabla}")
    filas = sqlite_cursor.fetchall()

    for fila in filas:

        columnas = fila.keys()

        placeholders = ", ".join(["%s"] * len(columnas))
        nombres_columnas = ", ".join(columnas)

        query = f"""
        INSERT INTO {tabla}
        ({nombres_columnas})
        VALUES ({placeholders})
        """

        pg_cursor.execute(
            query,
            tuple(fila)
        )

pg_conn.commit()

print("Migración completada")

sqlite_conn.close()
pg_conn.close()