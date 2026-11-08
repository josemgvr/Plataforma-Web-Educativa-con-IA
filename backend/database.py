import os
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno desde Supabase.env (o .env si existe)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_supabase = os.path.join(BASE_DIR, "Supabase.env")
if os.path.exists(env_supabase):
    load_dotenv(env_supabase)
env_local = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_local):
    load_dotenv(env_local)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Soporte SQLAlchemy (opcional para scripts)
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None

def get_db():
    if not SessionLocal:
        raise ValueError("DATABASE_URL no configurada.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_connection():
    """Retorna una conexión a PostgreSQL (Supabase) con dict_row para acceder a columnas por nombre."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL no configurada en las variables de entorno.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def init_db():
    """Verifica que la conexión con Supabase PostgreSQL esté activa al arrancar la app y que la tabla de logs exista."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.execute("""
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
                conn.commit()
        print("-> Conectado exitosamente a Supabase PostgreSQL y tabla deleted_logs verificada.")
    except Exception as e:
        print(f"-> Aviso: No se pudo verificar la conexión con Supabase: {e}")
