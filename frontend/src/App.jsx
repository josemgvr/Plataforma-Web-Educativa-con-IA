import { useState, useEffect } from 'react';

// URL base de la API FastAPI.
// Con Vite proxy en dev (puerto 5173), las rutas relativas se reenvían al backend en http://127.0.0.1:8000.
const API_BASE = window.location.port === '5173'
  ? ''
  : (window.location.origin.startsWith('http') ? window.location.origin : 'http://127.0.0.1:8000');

// Función auxiliar para capitalizar texto (ej: "alumno" -> "Alumno")
function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ========================================================
// COMPONENTE: CABECERA
// ========================================================
function Cabecera({ usuario, onAbrirLogin, onCerrarSesion }) {
  return (
    <header className="cabecera">
      <div className="contenedor-cabecera">
        <div className="logo-colegio">
          <h1>🏫 Colegio Mayor Cibeles</h1>
          <p className="subtitulo">Excelencia académica y formación integral en el corazón de Madrid</p>
        </div>
        
        <div className="area-usuario">
          {usuario ? (
            <>
              <span className="usuario-conectado">
                Conectado como: <strong>{usuario.nombre}</strong> ({capitalizar(usuario.rol)})
              </span>
              <button onClick={onCerrarSesion} className="boton-secundario">
                🚪 Salir
              </button>
            </>
          ) : (
            <button onClick={onAbrirLogin} className="boton-primario">
              🔑 Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ========================================================
// COMPONENTE: MODAL DE INICIO DE SESIÓN
// ========================================================
function ModalLogin({ estaAbierto, onCerrar, onLoginExitoso }) {
  const [rol, setRol] = useState('alumno');
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (estaAbierto) {
      setError('');
      setNombre('');
      setContrasena('');
    }
  }, [estaAbierto]);

  if (!estaAbierto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !contrasena) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const respuesta = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, nombre: nombre.trim(), contrasena })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.detail || 'Credenciales incorrectas o usuario no encontrado.');
      }

      const datosSesion = {
        id: resultado.usuario.id,
        nombre: resultado.usuario.nombre_apellidos || resultado.usuario.nombre,
        rol: resultado.usuario.rol,
        contrasena: contrasena
      };

      onLoginExitoso(datosSesion);
      onCerrar();
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('No se puede conectar con el backend. Asegúrate de que FastAPI está en ejecución en http://127.0.0.1:8000.');
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido">
        <div className="modal-cabecera">
          <h2>🔐 Acceso al Portal Académico</h2>
          <button onClick={onCerrar} className="btn-cerrar">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="campo-formulario">
            <label htmlFor="rol-login">Selecciona tu perfil:</label>
            <select id="rol-login" value={rol} onChange={(e) => setRol(e.target.value)} required>
              <option value="alumno">Alumno</option>
              <option value="profesor">Profesor</option>
              <option value="director">Director</option>
            </select>
          </div>

          <div className="campo-formulario">
            <label htmlFor="nombre-login">Nombre y apellidos:</label>
            <input
              type="text"
              id="nombre-login"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Lucas Morales Vega"
              required
            />
          </div>

          <div className="campo-formulario">
            <label htmlFor="pass-login">Contraseña:</label>
            <input
              type="password"
              id="pass-login"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Tu contraseña"
              required
            />
          </div>

          {error && <div className="alerta-error">{error}</div>}

          <div className="acciones-formulario">
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Accediendo...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: PORTAL PÚBLICO
// ========================================================
function VistaPublica() {
  return (
    <main className="contenedor-principal">
      <div className="banner-imagen">
        <img
          src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&auto=format&fit=crop&q=80"
          alt="Campus Central del Colegio Mayor Cibeles - Retiro, Madrid"
        />
        <span className="pie-banner">Campus Central del Colegio Mayor Cibeles — Retiro, Madrid</span>
      </div>

      <section className="seccion-bienvenida">
        <h2>🏛️ Bienvenidos al Colegio Mayor Cibeles</h2>
        <p>
          Fundado en 1978 en el emblemático distrito de Retiro de <strong>Madrid</strong>, el <strong>Colegio Mayor Cibeles</strong> es un referente
          en innovación pedagógica, rigor académico y educación en valores humanos. Formamos a estudiantes preparados
          para afrontar los desafíos del futuro con pensamiento crítico y compromiso social.
        </p>
      </section>

      <div className="rejilla-tres-columnas">
        <div className="tarjeta-info">
          <h3>🎓 Proyecto Educativo</h3>
          <ul>
            <li><strong>Metodología STEAM:</strong> Integración de ciencia, tecnología, ingeniería, arte y matemáticas.</li>
            <li><strong>Bilingüismo avanzado:</strong> Certificaciones oficiales de idiomas (Cambridge y DELF).</li>
            <li><strong>Atención personalizada:</strong> Seguimiento continuo del rendimiento y tutorías individuales.</li>
          </ul>
        </div>

        <div className="tarjeta-info">
          <h3>🔬 Nuestras Instalaciones</h3>
          <ul>
            <li>Laboratorios de robótica y biotecnología.</li>
            <li>Biblioteca con más de 15.000 volúmenes y espacio de co-working digital.</li>
            <li>Complejo deportivo: piscina climatizada, pistas polideportivas y gimnasio.</li>
          </ul>
        </div>

        <div className="tarjeta-info">
          <h3>📍 Ubicación y Contacto</h3>
          <ul>
            <li><strong>Dirección:</strong> Calle de Menéndez Pelayo 24, 28009 Madrid.</li>
            <li><strong>Metro:</strong> Retiro / Ibiza (Líneas 2 y 9).</li>
            <li><strong>Teléfono:</strong> (+34) 91 555 78 90</li>
            <li><strong>Email:</strong> secretaria@colegiomayorcibeles.es</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

// ========================================================
// COMPONENTE: PANEL DEL ALUMNO
// ========================================================
function VistaAlumno({ usuario, onCerrarSesion }) {
  const [seccionActiva, setSeccionActiva] = useState('personales');
  const [datosAlumno, setDatosAlumno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      setError('');
      try {
        const url = `${API_BASE}/alumnos/${usuario.id}?usuario_nombre=${encodeURIComponent(usuario.nombre)}&usuario_contrasena=${encodeURIComponent(usuario.contrasena)}&usuario_rol=alumno`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Error al obtener datos del alumno.');
        }
        const data = await res.json();
        setDatosAlumno(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }

    if (usuario && usuario.id) {
      cargarDatos();
    }
  }, [usuario]);

  function obtenerEstadoAcademico(nota) {
    if (nota >= 9) return 'Sobresaliente';
    if (nota >= 7) return 'Notable';
    if (nota >= 5) return 'Aprobado';
    return 'Necesita mejorar';
  }

  const primerNombre = usuario.nombre ? usuario.nombre.split(' ')[0] : 'Alumno';

  return (
    <div className="panel-privado">
      <aside className="barra-lateral">
        <div className="perfil-lateral">
          <img
            src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=300"
            alt="Avatar Alumno"
            className="avatar-alumno"
          />
          <h3>👋 Hola, {primerNombre}</h3>
          <span className="etiqueta-rol">Alumno</span>
        </div>

        <nav className="menu-navegacion">
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'personales' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('personales')}
          >
            📋 Datos personales
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'notas' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('notas')}
          >
            📊 Consultar notas
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'cursos' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('cursos')}
          >
            📚 Cursos
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'informe' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('informe')}
          >
            📄 Ver informe
          </button>
        </nav>

        <div className="lateral-inferior">
          <button onClick={onCerrarSesion} className="boton-peligro">
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="contenido-alumno">
        {cargando && (
          <div className="tarjeta-blanca">
            <p>⏳ Cargando expediente del estudiante...</p>
          </div>
        )}

        {error && (
          <div className="alerta-error">
            <p>❌ {error}</p>
          </div>
        )}

        {!cargando && datosAlumno && (
          <>
            {/* SUBSECCIÓN 1: DATOS PERSONALES */}
            {seccionActiva === 'personales' && (
              <div className="subseccion-alumno">
                <h2>📋 Ficha del Estudiante</h2>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica">
                    <span className="metrica-titulo">ID de Estudiante</span>
                    <span className="metrica-valor">{datosAlumno.id}</span>
                  </div>
                  <div className="tarjeta-metrica">
                    <span className="metrica-titulo">Asistencia</span>
                    <span className="metrica-valor">{datosAlumno.asistencia}%</span>
                  </div>
                  <div className="tarjeta-metrica">
                    <span className="metrica-titulo">Trabajos Entregados</span>
                    <span className="metrica-valor">{datosAlumno.trabajos_entregados}</span>
                  </div>
                </div>

                <div className="tarjeta-blanca">
                  <p><strong>Nombre completo:</strong> {datosAlumno.nombre_apellidos}</p>
                </div>

                <h3>🏆 Certificados Obtenidos</h3>
                <div className="lista-certificados">
                  {datosAlumno.certificados && datosAlumno.certificados.length > 0 ? (
                    datosAlumno.certificados.map((c, i) => (
                      <div key={i} className="item-certificado">
                        🏅 <strong>{c.nombre}</strong> — Obtenido el: {c.fecha_obtencion || 'Sin fecha registrada'}
                      </div>
                    ))
                  ) : (
                    <p className="texto-secundario">Aún no tienes certificados registrados.</p>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 2: CONSULTAR NOTAS */}
            {seccionActiva === 'notas' && (
              <div className="subseccion-alumno">
                <h2>📊 Rendimiento Académico</h2>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica">
                    <span className="metrica-titulo">Nota Media Global</span>
                    <span className="metrica-valor">{datosAlumno.nota_media} / 10</span>
                  </div>
                  <div className="tarjeta-metrica">
                    <span className="metrica-titulo">Estado Académico</span>
                    <span className="metrica-valor">{obtenerEstadoAcademico(datosAlumno.nota_media)}</span>
                  </div>
                </div>

                <h3>📝 Desglose de Notas por Curso</h3>
                <div className="lista-notas">
                  {datosAlumno.cursos && datosAlumno.cursos.length > 0 ? (
                    datosAlumno.cursos.map((c, i) => (
                      <div key={i} className="item-nota">
                        <div>
                          <strong>{c.nombre}</strong> ({c.materia})<br />
                          <small className="texto-secundario">
                            Periodo: {c.fecha_inicio || '-'} a {c.fecha_fin || '-'}
                          </small>
                        </div>
                        <span className="nota-badge">
                          Nota: {c.nota !== null && c.nota !== undefined ? c.nota : 'Pendiente'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="texto-secundario">No tienes cursos con notas asignadas actualmente.</p>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 3: CURSOS */}
            {seccionActiva === 'cursos' && (
              <div className="subseccion-alumno">
                <h2>📚 Cursos Matriculados</h2>
                <div className="rejilla-cursos">
                  {datosAlumno.cursos && datosAlumno.cursos.length > 0 ? (
                    datosAlumno.cursos.map((c, i) => (
                      <div key={i} className="tarjeta-curso">
                        <h4>📖 {c.nombre}</h4>
                        <p><strong>Materia:</strong> {c.materia}</p>
                        <p><strong>Fecha de inicio:</strong> {c.fecha_inicio || 'Por definir'}</p>
                        <p><strong>Fecha de finalización:</strong> {c.fecha_fin || 'Por definir'}</p>
                        <p><strong>Calificación actual:</strong> {c.nota !== null && c.nota !== undefined ? c.nota : 'En curso'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="texto-secundario">Actualmente no estás matriculado en ningún curso.</p>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 4: VER INFORME */}
            {seccionActiva === 'informe' && (
              <div className="subseccion-alumno">
                <h2>📄 Informe de Rendimiento Académico</h2>
                <div className="caja-aviso">
                  <h4>⚙️ Módulo en desarrollo</h4>
                  <p>La generación y exportación del informe analítico detallado estará disponible próximamente.</p>
                  <p className="texto-secundario">
                    En este apartado podrás visualizar un informe completo con estadísticas de progreso, fortalezas de aprendizaje y recomendaciones personalizadas.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ========================================================
// COMPONENTE: PANEL PROFESOR / DIRECTOR (TEMPORAL)
// ========================================================
function VistaOtroRol({ usuario, onCerrarSesion }) {
  const rolTitulo = capitalizar(usuario.rol);
  return (
    <main className="contenedor-principal panel-otro-rol">
      <div className="tarjeta-blanca">
        <h2>Panel de {rolTitulo}</h2>
        <p className="mensaje-destacado">
          Has iniciado sesión como {rolTitulo} ({usuario.nombre}).
        </p>
        <p>El panel de administración completo para profesores y directores se implementará en el siguiente paso.</p>
        <button onClick={onCerrarSesion} className="boton-primario">
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}

// ========================================================
// COMPONENTE: PIE DE PÁGINA
// ========================================================
function PiePagina() {
  return (
    <footer className="pie-pagina">
      <p>© 2026 Colegio Mayor Cibeles — Comunidad de Madrid. Todos los derechos reservados.</p>
    </footer>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL: APP
// ========================================================
function App() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = sessionStorage.getItem('usuarioSesion');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);

  function handleLoginExitoso(datosSesion) {
    setUsuario(datosSesion);
    sessionStorage.setItem('usuarioSesion', JSON.stringify(datosSesion));
  }

  function handleCerrarSesion() {
    setUsuario(null);
    sessionStorage.removeItem('usuarioSesion');
  }

  return (
    <div className="app-contenedor">
      <Cabecera
        usuario={usuario}
        onAbrirLogin={() => setModalLoginAbierto(true)}
        onCerrarSesion={handleCerrarSesion}
      />

      <ModalLogin
        estaAbierto={modalLoginAbierto}
        onCerrar={() => setModalLoginAbierto(false)}
        onLoginExitoso={handleLoginExitoso}
      />

      {!usuario && <VistaPublica />}

      {usuario && usuario.rol === 'alumno' && (
        <VistaAlumno usuario={usuario} onCerrarSesion={handleCerrarSesion} />
      )}

      {usuario && usuario.rol !== 'alumno' && (
        <VistaOtroRol usuario={usuario} onCerrarSesion={handleCerrarSesion} />
      )}

      <PiePagina />
    </div>
  );
}

export default App;
