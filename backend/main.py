from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import psycopg
import os
import json
try:
    from backend.database import get_connection, init_db
except ImportError:
    from database import get_connection, init_db

app = FastAPI(title="API Registro de Estudiantes", description="Sistema de gestión académica con roles de acceso")

# Permitir CORS para peticiones desde el frontend web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializamos la base de datos al arrancar
init_db()


# --- MODELOS DE ENTRADA (PYDANTIC) ---

class LoginRequest(BaseModel):
    rol: str
    nombre: str
    contrasena: str

class RegistroAlumno(BaseModel):
    nombre_apellidos: str
    contrasena: str
    nota_media: float = 0.0
    trabajos_entregados: int = 0
    asistencia: float = Field(default=100.0, gt=0, description="La asistencia debe ser mayor que 0")

class RegistroProfesor(BaseModel):
    nombre_apellidos: str
    contrasena: str
    telefono: str = ""

class RegistroDirector(BaseModel):
    nombre_apellidos: str
    contrasena: str

class CrearCurso(BaseModel):
    nombre: str
    materia: str

class CrearCertificado(BaseModel):
    nombre: str

class AsignarAlumnoCurso(BaseModel):
    alumno_id: int
    curso_id: int
    fecha_inicio: str = ""
    fecha_fin: str = ""
    nota: float = 0.0

class AsignarProfesorCurso(BaseModel):
    profesor_id: int
    curso_id: int

class AsignarAlumnoCertificado(BaseModel):
    alumno_id: int
    certificado_id: int
    fecha_obtencion: str = ""

class ActualizarNota(BaseModel):
    profesor_id: int
    alumno_id: int
    curso_id: int
    nota: float = Field(..., ge=0.0, le=10.0, description="Nota entre 0 y 10")
    usuario_nombre: str
    usuario_contrasena: str


# --- FUNCIONES AUXILIARES DE CONTROL DE ACCESO ---

def verificar_director(nombre: str, contrasena: str):
    """Verifica que el usuario sea un director con credenciales válidas."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM directores WHERE nombre_apellidos = %s AND contrasena = %s", (nombre, contrasena))
        director = cursor.fetchone()
        if not director:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas: solo un director/admin puede realizar esta acción.")
        return director
    finally:
        conn.close()

def verificar_profesor(nombre: str, contrasena: str):
    """Verifica que el usuario sea un profesor con credenciales válidas."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre_apellidos, telefono FROM profesores WHERE nombre_apellidos = %s AND contrasena = %s", (nombre, contrasena))
        profesor = cursor.fetchone()
        if not profesor:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas: profesor no encontrado.")
        return profesor
    finally:
        conn.close()

def registrar_log_eliminacion(conn, usuario_tipo: str, usuario_id: int, tabla: str, registro_id: int, datos: dict, motivo: str = "Eliminación solicitada por director"):
    """Registra en deleted_logs la auditoría de un registro eliminado según DATABASE_STRUTURE.md."""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deleted_logs (
            id BIGSERIAL PRIMARY KEY,
            fecha_eliminacion TIMESTAMP NOT NULL DEFAULT NOW(),
            usuario_tipo VARCHAR(20) NOT NULL,
            usuario_id INTEGER NOT NULL,
            tabla_afectada VARCHAR(50) NOT NULL,
            registro_id INTEGER NOT NULL,
            datos_eliminados JSONB NOT NULL,
            motivo TEXT
        );
    """)
    cursor.execute("""
        INSERT INTO deleted_logs (fecha_eliminacion, usuario_tipo, usuario_id, tabla_afectada, registro_id, datos_eliminados, motivo)
        VALUES (NOW(), %s, %s, %s, %s, %s, %s)
    """, (usuario_tipo, usuario_id, tabla, registro_id, json.dumps(datos, default=str), motivo))

def verificar_permiso_consulta(nombre: str, contrasena: str, rol: str, alumno_id_objetivo: int):
    """
    Verifica que las credenciales sean correctas y que el usuario tenga permiso:
    - Director: puede ver a cualquier alumno.
    - Alumno: solo puede ver sus propios datos.
    - Profesor: solo puede ver a alumnos de cursos que él imparte.
    """
    conn = get_connection()
    cursor = conn.cursor()
    rol = rol.lower().strip()

    try:
        if rol == "director":
            cursor.execute("SELECT id FROM directores WHERE nombre_apellidos = %s AND contrasena = %s", (nombre, contrasena))
            director = cursor.fetchone()
            if not director:
                raise HTTPException(status_code=401, detail="Credenciales incorrectas para el rol director.")
            return True

        elif rol == "alumno":
            cursor.execute("SELECT id FROM alumnos WHERE nombre_apellidos = %s AND contrasena = %s", (nombre, contrasena))
            alumno = cursor.fetchone()
            if not alumno:
                raise HTTPException(status_code=401, detail="Credenciales incorrectas para el rol alumno.")
            if alumno["id"] != alumno_id_objetivo:
                raise HTTPException(status_code=403, detail="Acceso denegado: un alumno solo puede ver su propia información.")
            return True

        elif rol == "profesor":
            cursor.execute("SELECT id FROM profesores WHERE nombre_apellidos = %s AND contrasena = %s", (nombre, contrasena))
            profesor = cursor.fetchone()
            if not profesor:
                raise HTTPException(status_code=401, detail="Credenciales incorrectas para el rol profesor.")
            
            # Verificar si el profesor y el alumno comparten al menos un curso
            cursor.execute("""
                SELECT 1
                FROM profesores_cursos pc
                JOIN alumnos_cursos ac ON pc.curso_id = ac.curso_id
                WHERE pc.profesor_id = %s AND ac.alumno_id = %s
            """, (profesor["id"], alumno_id_objetivo))
            
            coincidencia = cursor.fetchone()
            if not coincidencia:
                raise HTTPException(status_code=403, detail="Acceso denegado: solo el profesor que da clase a este alumno puede ver su información.")
            return True

        else:
            raise HTTPException(status_code=400, detail="Rol no válido. Opciones permitidas: alumno, profesor, director.")
    finally:
        conn.close()


# --- ENDPOINTS DE REGISTRO / ALTA DE USUARIOS ---

@app.post("/registro/alumno", summary="Registrar un nuevo alumno (o añadir por director)")
def registrar_alumno(datos: RegistroAlumno):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO alumnos (nombre_apellidos, contrasena, nota_media, trabajos_entregados, asistencia)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (datos.nombre_apellidos, datos.contrasena, datos.nota_media, datos.trabajos_entregados, datos.asistencia))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Alumno registrado con éxito", "id": nuevo_id, "nombre": datos.nombre_apellidos}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre ya está registrado o los datos no cumplen las restricciones.")
    finally:
        conn.close()

@app.post("/registro/profesor", summary="Registrar un nuevo profesor (o añadir por director)")
def registrar_profesor(datos: RegistroProfesor):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO profesores (nombre_apellidos, telefono, contrasena)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (datos.nombre_apellidos, datos.telefono, datos.contrasena))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Profesor registrado con éxito", "id": nuevo_id, "nombre": datos.nombre_apellidos}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre ya está registrado.")
    finally:
        conn.close()

@app.post("/registro/director", summary="Registrar un nuevo director/admin")
def registrar_director(datos: RegistroDirector):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO directores (nombre_apellidos, contrasena)
            VALUES (%s, %s)
            RETURNING id
        """, (datos.nombre_apellidos, datos.contrasena))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Director registrado con éxito", "id": nuevo_id, "nombre": datos.nombre_apellidos}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre ya está registrado.")
    finally:
        conn.close()


# --- ENDPOINTS DE GESTIÓN DE CURSOS Y CERTIFICADOS (DIRECTOR) ---

@app.post("/cursos", summary="Crear un nuevo curso (solo director)")
def crear_curso(
    datos: CrearCurso,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO cursos (nombre, materia) VALUES (%s, %s) RETURNING id", (datos.nombre, datos.materia))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Curso creado con éxito", "id": nuevo_id, "nombre": datos.nombre}
    finally:
        conn.close()

@app.get("/cursos", summary="Listar todos los cursos")
def listar_cursos():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre, materia FROM cursos")
        return [dict(fila) for fila in cursor.fetchall()]
    finally:
        conn.close()

@app.post("/certificados", summary="Crear un nuevo certificado (solo director)")
def crear_certificado(
    datos: CrearCertificado,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO certificados (nombre) VALUES (%s) RETURNING id", (datos.nombre,))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Certificado creado con éxito", "id": nuevo_id, "nombre": datos.nombre}
    finally:
        conn.close()

@app.get("/certificados", summary="Listar todos los certificados")
def listar_certificados():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre FROM certificados")
        return [dict(fila) for fila in cursor.fetchall()]
    finally:
        conn.close()


# --- ASIGNACIONES DE CURSOS Y CERTIFICADOS (DIRECTOR) ---

@app.post("/asignar/alumno-curso", summary="Asignar un alumno a un curso (solo director)")
def asignar_alumno_curso(
    datos: AsignarAlumnoCurso,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO alumnos_cursos (alumno_id, curso_id, fecha_inicio, fecha_fin, nota)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (datos.alumno_id, datos.curso_id, datos.fecha_inicio, datos.fecha_fin, datos.nota))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Alumno asignado al curso correctamente", "id": nuevo_id}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El alumno o el curso no existen.")
    finally:
        conn.close()

@app.post("/asignar/profesor-curso", summary="Asignar un profesor a impartir un curso (solo director)")
def asignar_profesor_curso(
    datos: AsignarProfesorCurso,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO profesores_cursos (profesor_id, curso_id)
            VALUES (%s, %s)
            RETURNING id
        """, (datos.profesor_id, datos.curso_id))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Profesor asignado al curso correctamente", "id": nuevo_id}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El profesor o el curso no existen.")
    finally:
        conn.close()

@app.post("/asignar/alumno-certificado", summary="Asignar un certificado obtenido a un alumno (solo director)")
def asignar_alumno_certificado(
    datos: AsignarAlumnoCertificado,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO alumnos_certificados (alumno_id, certificado_id, fecha_obtencion)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (datos.alumno_id, datos.certificado_id, datos.fecha_obtencion))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Certificado asignado al alumno correctamente", "id": nuevo_id}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El alumno o el certificado no existen.")
    finally:
        conn.close()


# --- GESTIÓN, ALTA, ELIMINACIÓN Y LISTADO DE USUARIOS (DIRECTOR) ---

@app.post("/alumnos", summary="Añadir un nuevo alumno (solo director)")
def agregar_alumno_director(
    datos: RegistroAlumno,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO alumnos (nombre_apellidos, contrasena, nota_media, trabajos_entregados, asistencia)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (datos.nombre_apellidos, datos.contrasena, datos.nota_media, datos.trabajos_entregados, datos.asistencia))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Alumno añadido correctamente por el director", "id": nuevo_id, "nombre": datos.nombre_apellidos}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre ya está registrado o los datos no cumplen las restricciones.")
    finally:
        conn.close()

@app.post("/profesores", summary="Añadir un nuevo profesor (solo director)")
def agregar_profesor_director(
    datos: RegistroProfesor,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO profesores (nombre_apellidos, telefono, contrasena)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (datos.nombre_apellidos, datos.telefono, datos.contrasena))
        nuevo_id = cursor.fetchone()["id"]
        conn.commit()
        return {"mensaje": "Profesor añadido correctamente por el director", "id": nuevo_id, "nombre": datos.nombre_apellidos}
    except psycopg.IntegrityError:
        raise HTTPException(status_code=400, detail="El nombre ya está registrado.")
    finally:
        conn.close()

@app.delete("/alumnos/{alumno_id}", summary="Eliminar un alumno y registrar log (solo director)")
def eliminar_alumno(
    alumno_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    director = verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM alumnos WHERE id = %s", (alumno_id,))
        alumno = cursor.fetchone()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado.")

        datos_dict = dict(alumno)
        datos_dict.pop("contrasena", None)
        registrar_log_eliminacion(conn, "director", director["id"], "alumnos", alumno_id, datos_dict, "Alumno dado de baja por director")

        cursor.execute("DELETE FROM alumnos WHERE id = %s", (alumno_id,))
        conn.commit()
        return {"mensaje": f"Alumno '{datos_dict.get('nombre_apellidos')}' (ID {alumno_id}) eliminado correctamente y registrado en deleted_logs."}
    finally:
        conn.close()

@app.delete("/profesores/{profesor_id}", summary="Eliminar un profesor y registrar log (solo director)")
def eliminar_profesor(
    profesor_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    director = verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM profesores WHERE id = %s", (profesor_id,))
        profesor = cursor.fetchone()
        if not profesor:
            raise HTTPException(status_code=404, detail="Profesor no encontrado.")

        datos_dict = dict(profesor)
        datos_dict.pop("contrasena", None)
        registrar_log_eliminacion(conn, "director", director["id"], "profesores", profesor_id, datos_dict, "Profesor dado de baja por director")

        cursor.execute("DELETE FROM profesores WHERE id = %s", (profesor_id,))
        conn.commit()
        return {"mensaje": f"Profesor '{datos_dict.get('nombre_apellidos')}' (ID {profesor_id}) eliminado correctamente y registrado en deleted_logs."}
    finally:
        conn.close()

@app.delete("/cursos/{curso_id}", summary="Eliminar un curso y registrar log (solo director)")
def eliminar_curso(
    curso_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    director = verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM cursos WHERE id = %s", (curso_id,))
        curso = cursor.fetchone()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado.")

        datos_dict = dict(curso)
        registrar_log_eliminacion(conn, "director", director["id"], "cursos", curso_id, datos_dict, "Curso eliminado por director")

        cursor.execute("DELETE FROM cursos WHERE id = %s", (curso_id,))
        conn.commit()
        return {"mensaje": f"Curso '{datos_dict.get('nombre')}' (ID {curso_id}) eliminado correctamente y registrado en deleted_logs."}
    finally:
        conn.close()

@app.delete("/certificados/{certificado_id}", summary="Eliminar un certificado y registrar log (solo director)")
def eliminar_certificado(
    certificado_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    director = verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM certificados WHERE id = %s", (certificado_id,))
        certificado = cursor.fetchone()
        if not certificado:
            raise HTTPException(status_code=404, detail="Certificado no encontrado.")

        datos_dict = dict(certificado)
        registrar_log_eliminacion(conn, "director", director["id"], "certificados", certificado_id, datos_dict, "Certificado eliminado por director")

        cursor.execute("DELETE FROM certificados WHERE id = %s", (certificado_id,))
        conn.commit()
        return {"mensaje": f"Certificado '{datos_dict.get('nombre')}' (ID {certificado_id}) eliminado correctamente y registrado en deleted_logs."}
    finally:
        conn.close()

@app.get("/certificados/panel", summary="Listar certificados con los alumnos que los poseen")
def listar_certificados_panel(
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre FROM certificados ORDER BY nombre ASC")
        certificados = [dict(c) for c in cursor.fetchall()]

        for cert in certificados:
            cursor.execute("""
                SELECT a.id, a.nombre_apellidos, a.asistencia, a.nota_media, ac.fecha_obtencion
                FROM alumnos_certificados ac
                JOIN alumnos a ON ac.alumno_id = a.id
                WHERE ac.certificado_id = %s
                ORDER BY a.nombre_apellidos ASC
            """, (cert["id"],))
            alumnos = [dict(a) for a in cursor.fetchall()]
            cert["alumnos"] = alumnos
            cert["total_alumnos"] = len(alumnos)

        return certificados
    finally:
        conn.close()

@app.get("/director/logs-eliminacion", summary="Consultar auditoría de registros eliminados (deleted_logs)")
def obtener_logs_eliminacion(
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deleted_logs (
                id BIGSERIAL PRIMARY KEY,
                fecha_eliminacion TIMESTAMP NOT NULL DEFAULT NOW(),
                usuario_tipo VARCHAR(20) NOT NULL,
                usuario_id INTEGER NOT NULL,
                tabla_afectada VARCHAR(50) NOT NULL,
                registro_id INTEGER NOT NULL,
                datos_eliminados JSONB NOT NULL,
                motivo TEXT
            );
        """)
        cursor.execute("""
            SELECT id, fecha_eliminacion, usuario_tipo, usuario_id, tabla_afectada, registro_id, datos_eliminados, motivo
            FROM deleted_logs
            ORDER BY fecha_eliminacion DESC
            LIMIT 50
        """)
        logs = []
        for fila in cursor.fetchall():
            d = dict(fila)
            d["fecha_eliminacion"] = str(d["fecha_eliminacion"])
            logs.append(d)
        return logs
    finally:
        conn.close()

@app.get("/alumnos", summary="Listar todos los alumnos (solo director)")
def listar_alumnos(
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre_apellidos, nota_media, trabajos_entregados, asistencia FROM alumnos")
        return [dict(fila) for fila in cursor.fetchall()]
    finally:
        conn.close()

@app.get("/profesores", summary="Listar todos los profesores (solo director)")
def listar_profesores(
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre_apellidos, telefono FROM profesores")
        return [dict(fila) for fila in cursor.fetchall()]
    finally:
        conn.close()


# --- CONSULTA DE INFORMACIÓN DEL ALUMNO ---

@app.get("/alumnos/{alumno_id}", summary="Consultar información de un alumno con control de permisos")
def obtener_alumno(
    alumno_id: int,
    usuario_nombre: str = Query(..., description="Tu nombre registrado"),
    usuario_contrasena: str = Query(..., description="Tu contraseña"),
    usuario_rol: str = Query(..., description="Tu rol: alumno, profesor o director")
):
    # 1. Comprobar permisos
    verificar_permiso_consulta(usuario_nombre, usuario_contrasena, usuario_rol, alumno_id)

    # 2. Consultar datos del alumno
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, nombre_apellidos, nota_media, trabajos_entregados, asistencia
            FROM alumnos
            WHERE id = %s
        """, (alumno_id,))
        alumno = cursor.fetchone()
        if not alumno:
            raise HTTPException(status_code=404, detail="Alumno no encontrado.")

        # Cursos del alumno
        cursor.execute("""
            SELECT c.id, c.nombre, c.materia, ac.fecha_inicio, ac.fecha_fin, ac.nota
            FROM alumnos_cursos ac
            JOIN cursos c ON ac.curso_id = c.id
            WHERE ac.alumno_id = %s
        """, (alumno_id,))
        cursos = [dict(c) for c in cursor.fetchall()]

        # Certificados del alumno
        cursor.execute("""
            SELECT cert.id, cert.nombre, ac.fecha_obtencion
            FROM alumnos_certificados ac
            JOIN certificados cert ON ac.certificado_id = cert.id
            WHERE ac.alumno_id = %s
        """, (alumno_id,))
        certificados = [dict(cert) for cert in cursor.fetchall()]

        resultado = dict(alumno)
        resultado["cursos"] = cursos
        resultado["certificados"] = certificados

        return resultado
    finally:
        conn.close()


# --- GESTIÓN Y PANEL DEL PROFESOR ---

@app.get("/profesores/{profesor_id}/panel", summary="Obtener cursos, alumnos y estadísticas del profesor")
def obtener_panel_profesor(
    profesor_id: int,
    usuario_nombre: str = Query(..., description="Nombre del profesor"),
    usuario_contrasena: str = Query(..., description="Contraseña del profesor")
):
    profesor = verificar_profesor(usuario_nombre, usuario_contrasena)
    if profesor["id"] != profesor_id:
        raise HTTPException(status_code=403, detail="No puedes acceder al panel de otro docente.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Cursos impartidos por el profesor
        cursor.execute("""
            SELECT c.id, c.nombre, c.materia
            FROM profesores_cursos pc
            JOIN cursos c ON pc.curso_id = c.id
            WHERE pc.profesor_id = %s
            ORDER BY c.nombre ASC
        """, (profesor_id,))
        cursos_raw = cursor.fetchall()
        curso_ids = [c["id"] for c in cursos_raw]

        alumnos = []
        cursos = []
        total_alumnos_unicos = set()
        total_aprobados = 0
        total_calificaciones = 0
        suma_notas = 0.0

        if curso_ids:
            # Obtener alumnos inscritos en esos cursos
            cursor.execute("""
                SELECT 
                    a.id AS alumno_id,
                    a.nombre_apellidos,
                    a.nota_media,
                    a.trabajos_entregados,
                    a.asistencia,
                    c.id AS curso_id,
                    c.nombre AS curso_nombre,
                    c.materia AS curso_materia,
                    ac.id AS inscripcion_id,
                    ac.nota,
                    ac.fecha_inicio,
                    ac.fecha_fin
                FROM alumnos_cursos ac
                JOIN alumnos a ON ac.alumno_id = a.id
                JOIN cursos c ON ac.curso_id = c.id
                WHERE ac.curso_id = ANY(%s)
                ORDER BY a.nombre_apellidos ASC
            """, (curso_ids,))
            alumnos_raw = cursor.fetchall()

            for a in alumnos_raw:
                alumno_dict = dict(a)
                alumnos.append(alumno_dict)
                total_alumnos_unicos.add(alumno_dict["alumno_id"])
                if alumno_dict["nota"] is not None:
                    total_calificaciones += 1
                    suma_notas += float(alumno_dict["nota"])
                    if float(alumno_dict["nota"]) >= 5.0:
                        total_aprobados += 1

            # Calcular alumnos y media por cada curso
            for c in cursos_raw:
                c_dict = dict(c)
                alumnos_en_curso = [a for a in alumnos if a["curso_id"] == c["id"]]
                c_dict["total_alumnos"] = len(alumnos_en_curso)
                notas_curso = [float(a["nota"]) for a in alumnos_en_curso if a["nota"] is not None]
                c_dict["nota_media"] = round(sum(notas_curso) / len(notas_curso), 2) if notas_curso else 0.0
                cursos.append(c_dict)

            # Asistencia media de los alumnos a los que da clase
            if total_alumnos_unicos:
                cursor.execute("""
                    SELECT AVG(asistencia) as asistencia_media
                    FROM alumnos
                    WHERE id = ANY(%s)
                """, (list(total_alumnos_unicos),))
                asist_fila = cursor.fetchone()
                asistencia_media = round(float(asist_fila["asistencia_media"]), 1) if (asist_fila and asist_fila["asistencia_media"] is not None) else 0.0
            else:
                asistencia_media = 0.0
        else:
            asistencia_media = 0.0

        tasa_aprobados = round((total_aprobados / total_calificaciones * 100), 1) if total_calificaciones > 0 else 0.0
        promedio_global = round((suma_notas / total_calificaciones), 2) if total_calificaciones > 0 else 0.0

        return {
            "profesor": {
                "id": profesor["id"],
                "nombre": profesor["nombre_apellidos"],
                "telefono": profesor["telefono"]
            },
            "estadisticas": {
                "total_cursos": len(cursos),
                "total_alumnos": len(total_alumnos_unicos),
                "promedio_global": promedio_global,
                "tasa_aprobados": tasa_aprobados,
                "asistencia_media": asistencia_media
            },
            "cursos": cursos,
            "alumnos": alumnos
        }
    finally:
        conn.close()

@app.put("/profesores/calificar", summary="Agregar o modificar nota de un alumno en un curso impartido")
def calificar_alumno(datos: ActualizarNota):
    profesor = verificar_profesor(datos.usuario_nombre, datos.usuario_contrasena)
    if profesor["id"] != datos.profesor_id:
        raise HTTPException(status_code=403, detail="No tienes autorización para realizar calificaciones en nombre de otro docente.")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verificar que el profesor imparte el curso
        cursor.execute("""
            SELECT 1 FROM profesores_cursos
            WHERE profesor_id = %s AND curso_id = %s
        """, (datos.profesor_id, datos.curso_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Acceso denegado: no impartes este curso.")

        # Verificar que el alumno está en el curso y actualizar nota
        cursor.execute("""
            UPDATE alumnos_cursos
            SET nota = %s
            WHERE alumno_id = %s AND curso_id = %s
            RETURNING id
        """, (datos.nota, datos.alumno_id, datos.curso_id))
        actualizado = cursor.fetchone()
        if not actualizado:
            raise HTTPException(status_code=404, detail="El alumno no se encuentra matriculado en este curso.")

        # Recalcular la nota media general del alumno
        cursor.execute("""
            SELECT ROUND(AVG(nota)::numeric, 2) AS nueva_media
            FROM alumnos_cursos
            WHERE alumno_id = %s AND nota IS NOT NULL
        """, (datos.alumno_id,))
        fila_media = cursor.fetchone()
        nueva_media = float(fila_media["nueva_media"]) if (fila_media and fila_media["nueva_media"] is not None) else datos.nota

        cursor.execute("""
            UPDATE alumnos
            SET nota_media = %s
            WHERE id = %s
        """, (nueva_media, datos.alumno_id))

        conn.commit()

        return {
            "mensaje": "Calificación registrada con éxito",
            "alumno_id": datos.alumno_id,
            "curso_id": datos.curso_id,
            "nota": datos.nota,
            "nueva_nota_media": nueva_media
        }
    finally:
        conn.close()


# --- GESTIÓN Y PANEL DEL DIRECTOR ---

@app.get("/director/panel", summary="Obtener estadísticas macro del colegio y cursos")
def obtener_panel_director(
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Conteos globales
        cursor.execute("SELECT COUNT(*) as c FROM alumnos")
        total_alumnos = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM profesores")
        total_profesores = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM cursos")
        total_cursos = cursor.fetchone()["c"]

        # Promedio global y asistencia
        cursor.execute("SELECT ROUND(AVG(nota_media)::numeric, 2) as media, ROUND(AVG(asistencia)::numeric, 1) as asist FROM alumnos")
        fila_stats = cursor.fetchone()
        nota_media_colegio = float(fila_stats["media"]) if (fila_stats and fila_stats["media"] is not None) else 0.0
        asistencia_media_colegio = float(fila_stats["asist"]) if (fila_stats and fila_stats["asist"] is not None) else 0.0

        # Aprobados
        cursor.execute("SELECT COUNT(*) as c FROM alumnos WHERE nota_media >= 5.0")
        total_aprobados = cursor.fetchone()["c"]
        tasa_aprobados = round((total_aprobados / total_alumnos * 100), 1) if total_alumnos > 0 else 0.0

        # Distribución de notas
        cursor.execute("SELECT COUNT(*) as c FROM alumnos WHERE nota_media >= 9.0")
        sobresalientes = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM alumnos WHERE nota_media >= 7.0 AND nota_media < 9.0")
        notables = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM alumnos WHERE nota_media >= 5.0 AND nota_media < 7.0")
        aprobados_ordinarios = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM alumnos WHERE nota_media < 5.0")
        en_refuerzo = cursor.fetchone()["c"]

        # Cursos con métricas agregadas
        cursor.execute("""
            SELECT 
                c.id, c.nombre, c.materia,
                COUNT(DISTINCT ac.alumno_id) as total_alumnos,
                COUNT(DISTINCT pc.profesor_id) as total_profesores,
                ROUND(AVG(ac.nota)::numeric, 2) as nota_media
            FROM cursos c
            LEFT JOIN alumnos_cursos ac ON c.id = ac.curso_id
            LEFT JOIN profesores_cursos pc ON c.id = pc.curso_id
            GROUP BY c.id, c.nombre, c.materia
            ORDER BY c.nombre ASC
        """)
        cursos_raw = cursor.fetchall()
        cursos = []
        for cr in cursos_raw:
            c_dict = dict(cr)
            c_dict["nota_media"] = float(c_dict["nota_media"]) if c_dict["nota_media"] is not None else 0.0
            cursos.append(c_dict)

        return {
            "estadisticas": {
                "total_alumnos": total_alumnos,
                "total_profesores": total_profesores,
                "total_cursos": total_cursos,
                "nota_media_colegio": nota_media_colegio,
                "asistencia_media_colegio": asistencia_media_colegio,
                "tasa_aprobados": tasa_aprobados,
                "distribucion": {
                    "sobresalientes": sobresalientes,
                    "notables": notables,
                    "aprobados": aprobados_ordinarios,
                    "refuerzo": en_refuerzo
                }
            },
            "cursos": cursos
        }
    finally:
        conn.close()

@app.get("/cursos/{curso_id}/detalle", summary="Detalle de un curso con profesores y alumnos")
def obtener_detalle_curso(
    curso_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre, materia FROM cursos WHERE id = %s", (curso_id,))
        curso = cursor.fetchone()
        if not curso:
            raise HTTPException(status_code=404, detail="Curso no encontrado.")

        cursor.execute("""
            SELECT p.id, p.nombre_apellidos, p.telefono
            FROM profesores_cursos pc
            JOIN profesores p ON pc.profesor_id = p.id
            WHERE pc.curso_id = %s
        """, (curso_id,))
        profesores = [dict(p) for p in cursor.fetchall()]

        cursor.execute("""
            SELECT a.id, a.nombre_apellidos, a.asistencia, a.nota_media as nota_media_global, ac.nota, ac.fecha_inicio, ac.fecha_fin
            FROM alumnos_cursos ac
            JOIN alumnos a ON ac.alumno_id = a.id
            WHERE ac.curso_id = %s
            ORDER BY a.nombre_apellidos ASC
        """, (curso_id,))
        alumnos = [dict(a) for a in cursor.fetchall()]

        cursor.execute("SELECT ROUND(AVG(nota)::numeric, 2) as media FROM alumnos_cursos WHERE curso_id = %s AND nota IS NOT NULL", (curso_id,))
        fila_media = cursor.fetchone()
        nota_media = float(fila_media["media"]) if (fila_media and fila_media["media"] is not None) else 0.0

        resultado = dict(curso)
        resultado["profesores"] = profesores
        resultado["alumnos"] = alumnos
        resultado["nota_media"] = nota_media
        return resultado
    finally:
        conn.close()

@app.get("/profesores/{profesor_id}/detalle", summary="Detalle de un profesor con sus cursos asignados")
def obtener_detalle_profesor(
    profesor_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, nombre_apellidos, telefono FROM profesores WHERE id = %s", (profesor_id,))
        profesor = cursor.fetchone()
        if not profesor:
            raise HTTPException(status_code=404, detail="Profesor no encontrado.")

        cursor.execute("""
            SELECT c.id, c.nombre, c.materia, COUNT(ac.alumno_id) as total_alumnos, ROUND(AVG(ac.nota)::numeric, 2) as nota_media
            FROM profesores_cursos pc
            JOIN cursos c ON pc.curso_id = c.id
            LEFT JOIN alumnos_cursos ac ON c.id = ac.curso_id
            WHERE pc.profesor_id = %s
            GROUP BY c.id, c.nombre, c.materia
            ORDER BY c.nombre ASC
        """, (profesor_id,))
        cursos = [dict(c) for c in cursor.fetchall()]

        resultado = dict(profesor)
        resultado["cursos"] = cursos
        return resultado
    finally:
        conn.close()


# --- INICIO DE SESIÓN Y SERVICIO DEL FRONTEND ---

@app.post("/login", summary="Iniciar sesión en el portal")
def login(datos: LoginRequest):
    rol = datos.rol.lower().strip()
    if rol not in ["alumno", "profesor", "director"]:
        raise HTTPException(status_code=400, detail="Rol no válido. Debe ser alumno, profesor o director.")

    tabla = "alumnos" if rol == "alumno" else ("profesores" if rol == "profesor" else "directores")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT * FROM {tabla} WHERE nombre_apellidos = %s AND contrasena = %s", (datos.nombre, datos.contrasena))
        usuario = cursor.fetchone()
        if not usuario:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas o usuario no encontrado.")

        usuario_dict = dict(usuario)
        usuario_dict.pop("contrasena", None)
        usuario_dict["rol"] = rol
        usuario_dict["nombre"] = usuario_dict.get("nombre_apellidos", "")
        return {"mensaje": "Inicio de sesión correcto", "usuario": usuario_dict}
    finally:
        conn.close()


# Servir archivos estáticos del frontend (compatible con build de Vite o desarrollo directo)
BASE_PROYECTO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_PROYECTO, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")

if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

@app.get("/", summary="Servir página principal del frontend")
def pagina_principal():
    index_dist = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_dist):
        return FileResponse(index_dist)
    index_frontend = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_frontend):
        return FileResponse(index_frontend)
    return {"mensaje": "Portal de Estudiantes API funcionando."}
