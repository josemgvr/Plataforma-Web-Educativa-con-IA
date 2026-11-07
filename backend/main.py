from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import psycopg
import os
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

@app.delete("/alumnos/{alumno_id}", summary="Eliminar un alumno (solo director)")
def eliminar_alumno(
    alumno_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM alumnos WHERE id = %s", (alumno_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Alumno no encontrado.")
        conn.commit()
        return {"mensaje": f"Alumno con ID {alumno_id} eliminado correctamente."}
    finally:
        conn.close()

@app.delete("/profesores/{profesor_id}", summary="Eliminar un profesor (solo director)")
def eliminar_profesor(
    profesor_id: int,
    director_nombre: str = Query(..., description="Nombre del director"),
    director_contrasena: str = Query(..., description="Contraseña del director")
):
    verificar_director(director_nombre, director_contrasena)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM profesores WHERE id = %s", (profesor_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profesor no encontrado.")
        conn.commit()
        return {"mensaje": f"Profesor con ID {profesor_id} eliminado correctamente."}
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
