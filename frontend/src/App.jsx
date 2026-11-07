import { useState, useEffect } from 'react';

// URL base de la API FastAPI.
const API_BASE = window.location.port === '5173'
  ? ''
  : (window.location.origin.startsWith('http') ? window.location.origin : 'http://127.0.0.1:8000');

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ========================================================
// COMPONENTE: CABECERA INSTITUCIONAL
// ========================================================
function Cabecera({ usuario, onAbrirLogin, onCerrarSesion }) {
  const iniciales = usuario && usuario.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')
    : 'U';

  return (
    <header className="cabecera">
      <div className="contenedor-cabecera">
        <div className="logo-colegio">
          <div className="escudo-icono">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="logo-textos">
            <h1>Colegio Mayor Cibeles</h1>
            <p className="subtitulo">Excelencia Académica · Comunidad de Madrid</p>
          </div>
        </div>

        <div className="area-usuario">
          {usuario ? (
            <>
              <div className="chip-sesion">
                <div className="avatar-mini">{iniciales}</div>
                <div className="usuario-info-texto">
                  <span>{usuario.nombre}</span>
                  <span className="badge-rol">{capitalizar(usuario.rol)}</span>
                </div>
              </div>
              <button onClick={onCerrarSesion} className="boton-secundario" title="Cerrar sesión actual">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Salir
              </button>
            </>
          ) : (
            <button onClick={onAbrirLogin} className="boton-primario">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Acceso al Portal
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Credenciales oficiales de prueba sincronizadas con CREDENCIALES_PRUEBA.md y SQLite
const CREDENCIALES_DEMO = {
  alumno: {
    nombre: 'Javier Martin Ramos',
    contrasena: 'alumno123'
  },
  profesor: {
    nombre: 'Ivan Martinez Gomez',
    contrasena: 'profesor123'
  },
  director: {
    nombre: 'Elena Navarro Gómez',
    contrasena: 'admin123'
  }
};

// ========================================================
// COMPONENTE: MODAL DE INICIO DE SESIÓN
// ========================================================
function ModalLogin({ estaAbierto, onCerrar, onLoginExitoso }) {
  const [rol, setRol] = useState('alumno');
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [autocompletarTest, setAutocompletarTest] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (estaAbierto) {
      setError('');
      if (autocompletarTest) {
        const cred = CREDENCIALES_DEMO[rol];
        if (cred) {
          setNombre(cred.nombre);
          setContrasena(cred.contrasena);
        }
      } else {
        setNombre('');
        setContrasena('');
      }
    }
  }, [estaAbierto]);

  if (!estaAbierto) return null;

  function toggleAutocompletado() {
    const nuevoEstado = !autocompletarTest;
    setAutocompletarTest(nuevoEstado);
    setError('');
    if (nuevoEstado) {
      const cred = CREDENCIALES_DEMO[rol];
      if (cred) {
        setNombre(cred.nombre);
        setContrasena(cred.contrasena);
      }
    } else {
      setNombre('');
      setContrasena('');
    }
  }

  function cambiarRol(nuevoRol) {
    setRol(nuevoRol);
    setError('');
    if (autocompletarTest) {
      const cred = CREDENCIALES_DEMO[nuevoRol];
      if (cred) {
        setNombre(cred.nombre);
        setContrasena(cred.contrasena);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !contrasena) {
      setError('Por favor, ingresa tus credenciales completas.');
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
        setError('No se pudo conectar con el servidor API. Verifica que FastAPI está iniciado.');
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
          <div className="modal-cabecera-texto">
            <h2>Acceso Institucional</h2>
            <p>Introduce tus credenciales autorizadas</p>
          </div>
          <div className="modal-cabecera-acciones">
            <button
              type="button"
              onClick={toggleAutocompletado}
              className={`btn-toggle-demo ${autocompletarTest ? 'activo' : ''}`}
              title={autocompletarTest ? 'Desactivar autocompletado de prueba' : 'Activar autocompletado con credenciales de prueba'}
            >
              <span className="indicador-switch"></span>
              <span>{autocompletarTest ? 'Pruebas: ON' : 'Pruebas: OFF'}</span>
            </button>
            <button onClick={onCerrar} className="btn-cerrar" title="Cerrar modal">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Selector de rol segmentado visual */}
          <div className="selector-rol-segmentado">
            <button
              type="button"
              className={`btn-opcion-rol ${rol === 'alumno' ? 'activo' : ''}`}
              onClick={() => cambiarRol('alumno')}
            >
              <span>🎓</span> Alumno
            </button>
            <button
              type="button"
              className={`btn-opcion-rol ${rol === 'profesor' ? 'activo' : ''}`}
              onClick={() => cambiarRol('profesor')}
            >
              <span>👨‍🏫</span> Profesor
            </button>
            <button
              type="button"
              className={`btn-opcion-rol ${rol === 'director' ? 'activo' : ''}`}
              onClick={() => cambiarRol('director')}
            >
              <span>🏛️</span> Director
            </button>
          </div>

          <div className="campo-formulario">
            <label htmlFor="nombre-login">Nombre y Apellidos</label>
            <div className="input-con-icono">
              <span className="input-icono-left">👤</span>
              <input
                type="text"
                id="nombre-login"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo registrado"
                required
              />
            </div>
          </div>

          <div className="campo-formulario">
            <label htmlFor="pass-login">Contraseña</label>
            <div className="input-con-icono">
              <span className="input-icono-left">🔒</span>
              <input
                type="password"
                id="pass-login"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Contraseña del portal"
                required
              />
            </div>
          </div>

          {autocompletarTest && (
            <div className="credenciales-demo-box">
              ⚡ <strong>Autocompletado de prueba activo:</strong> Credenciales oficiales cargadas para <strong>{capitalizar(rol)}</strong> ({rol === 'alumno' ? 'Javier Martin Ramos' : rol === 'profesor' ? 'Ivan Martinez Gomez' : 'Elena Navarro Gómez'}).
            </div>
          )}

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="acciones-formulario">
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: PORTAL PÚBLICO (WOW & PRESTIGIO)
// ========================================================
function VistaPublica({ onAbrirLogin }) {
  return (
    <main className="contenedor-principal">
      {/* HERO SECTION DE PRESTIGIO */}
      <section className="hero-institucional">
        <div className="hero-contenido">
          <div className="insignia-prestigio">
            <span>⚜️</span> Excelencia Educativa · Fundado en 1978
          </div>
          <h2 className="hero-titulo">
            Formando a los <span>Líderes y Científicos</span> del Mañana
          </h2>
          <p className="hero-descripcion">
            Situado en el distrito de Retiro de Madrid, el Colegio Mayor Cibeles fusiona tradición humanista,
            tecnología de vanguardia y rigor pedagógico para inspirar el máximo potencial de cada alumno.
          </p>
          <div className="hero-acciones">
            <button onClick={onAbrirLogin} className="boton-dorado">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Acceso a Expedientes
            </button>
            <a href="#pilares" className="boton-secundario" style={{ textDecoration: 'none' }}>
              Conoce el Centro
            </a>
          </div>
        </div>

        <div className="hero-imagen-wrapper">
          <img
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80"
            alt="Campus Central del Colegio Mayor Cibeles en Madrid"
          />
          <div className="hero-badge-flotante">
            <div className="hero-badge-icono">★</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Top 5 Colegios Madrid</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Evaluación Educativa Oficial 2026</div>
            </div>
          </div>
        </div>
      </section>

      {/* CIFRAS DE EXCELENCIA */}
      <section className="cifras-impacto">
        <div className="tarjeta-cifra">
          <div className="cifra-numero">98.6<span>%</span></div>
          <div className="cifra-etiqueta">Acceso a la Universidad</div>
        </div>
        <div className="tarjeta-cifra">
          <div className="cifra-numero">+45</div>
          <div className="cifra-etiqueta">Años de Trayectoria</div>
        </div>
        <div className="tarjeta-cifra">
          <div className="cifra-numero">100<span>%</span></div>
          <div className="cifra-etiqueta">Bilingüismo Certificado</div>
        </div>
        <div className="tarjeta-cifra">
          <div className="cifra-numero">15<span>:1</span></div>
          <div className="cifra-etiqueta">Ratio Alumno por Aula</div>
        </div>
      </section>

      {/* PILARES INSTITUCIONALES */}
      <div className="seccion-encabezado" id="pilares">
        <div className="seccion-subtitulo">Tradición y Futuro</div>
        <h3 className="seccion-titulo">Pilares de Nuestra Propuesta Formativa</h3>
      </div>

      <section className="rejilla-tres-columnas">
        <div className="tarjeta-info">
          <div className="icono-tarjeta-wrap">🔬</div>
          <h3>Metodología STEAM</h3>
          <ul>
            <li>Integración activa de Ciencias, Robótica, Matemáticas y Creatividad artística.</li>
            <li>Laboratorios de prototipado rápido y biotecnología aplicada.</li>
            <li>Participación regular en certámenes de investigación nacional.</li>
          </ul>
        </div>

        <div className="tarjeta-info">
          <div className="icono-tarjeta-wrap">🌍</div>
          <h3>Proyección Internacional</h3>
          <ul>
            <li>Currículum bilingüe con acreditación Cambridge English y DELF Francés.</li>
            <li>Programas de inmersión académica y debate competitivo parlamentario.</li>
            <li>Convenios con las principales universidades europeas y americanas.</li>
          </ul>
        </div>

        <div className="tarjeta-info">
          <div className="icono-tarjeta-wrap">🏛️</div>
          <h3>Campus & Ubicación</h3>
          <ul>
            <li>Enclave histórico en Calle Menéndez Pelayo, junto a los Jardines del Retiro.</li>
            <li>Biblioteca central con más de 15.000 títulos y salas de co-working.</li>
            <li>Pabellón polideportivo, piscina climatizada y pistas reglamentarias.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

// ========================================================
// COMPONENTE: PANEL PRIVADO DEL ESTUDIANTE (DASHBOARD WOW)
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

  function obtenerClaseEstado(nota) {
    if (nota >= 9) return { texto: 'Sobresaliente', clase: 'excelente' };
    if (nota >= 7) return { texto: 'Notable', clase: 'notable' };
    if (nota >= 5) return { texto: 'Aprobado', clase: 'aprobado' };
    return { texto: 'En refuerzo', clase: 'aprobado' };
  }

  const primerNombre = usuario.nombre ? usuario.nombre.split(' ')[0] : 'Alumno';

  return (
    <div className="panel-privado">
      {/* BARRA LATERAL EJECUTIVA */}
      <aside className="barra-lateral">
        <div className="perfil-lateral">
          <div className="avatar-alumno-wrapper">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
              alt="Avatar del Estudiante"
              className="avatar-alumno"
            />
            <div className="insignia-verificado" title="Expediente Oficial Verificado">✓</div>
          </div>
          <h3>{usuario.nombre}</h3>
          <div className="matricula-id">Expediente ID: #{usuario.id}</div>
          <span className="etiqueta-rol">Estudiante Activo</span>
        </div>

        <nav className="menu-navegacion">
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'personales' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('personales')}
          >
            <span className="btn-nav-icono">📋</span> Ficha Personal
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'notas' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('notas')}
          >
            <span className="btn-nav-icono">📊</span> Calificaciones
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'cursos' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('cursos')}
          >
            <span className="btn-nav-icono">📚</span> Cursos y Horarios
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'informe' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('informe')}
          >
            <span className="btn-nav-icono">📑</span> Informe de Rendimiento
          </button>
        </nav>

        <div className="lateral-inferior">
          <button onClick={onCerrarSesion} className="boton-peligro">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Finalizar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL DEL DASHBOARD */}
      <section className="contenido-alumno">
        {/* Banner de saludo oficial */}
        <div className="banner-bienvenida-alumno">
          <div className="banner-alumno-textos">
            <h2>Expediente de {primerNombre}</h2>
            <p>Bienvenido a tu panel de seguimiento curricular y acreditaciones académicas.</p>
          </div>
          <div className="banner-alumno-periodo">
            Curso Académico 2026/2027
          </div>
        </div>

        {cargando && (
          <div className="tarjeta-blanca" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--navy-700)', fontWeight: '600' }}>
              ⏳ Sincronizando expediente con la base de datos oficial...
            </p>
          </div>
        )}

        {error && (
          <div className="alerta-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {!cargando && datosAlumno && (
          <>
            {/* SUBSECCIÓN 1: DATOS PERSONALES */}
            {seccionActiva === 'personales' && (
              <div>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Asistencia Oficial</span>
                      <div className="metrica-icono">📅</div>
                    </div>
                    <div className="metrica-valor">{datosAlumno.asistencia}%</div>
                    <div className="metrica-subtexto">
                      <span>✓</span> Cumple con el estándar de regularidad (&gt;90%)
                    </div>
                    <div className="barra-progreso-mini">
                      <div className="barra-progreso-fill emerald" style={{ width: `${Math.min(datosAlumno.asistencia, 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Trabajos Entregados</span>
                      <div className="metrica-icono">📝</div>
                    </div>
                    <div className="metrica-valor">{datosAlumno.trabajos_entregados}</div>
                    <div className="metrica-subtexto">Proyectos y prácticas validadas</div>
                    <div className="barra-progreso-mini">
                      <div className="barra-progreso-fill" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica destacada">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Promedio Global</span>
                      <div className="metrica-icono">🏆</div>
                    </div>
                    <div className="metrica-valor">{datosAlumno.nota_media} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span></div>
                    <div className="metrica-subtexto">
                      Estado: <strong>{obtenerClaseEstado(datosAlumno.nota_media).texto}</strong>
                    </div>
                    <div className="barra-progreso-mini">
                      <div className="barra-progreso-fill gold" style={{ width: `${(datosAlumno.nota_media / 10) * 100}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="tarjeta-blanca">
                  <div className="encabezado-bloque">
                    <h3>🏆 Certificaciones y Diplomas Acreditados</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gold-600)', fontWeight: '700' }}>
                      {datosAlumno.certificados ? datosAlumno.certificados.length : 0} Registrados
                    </span>
                  </div>

                  <div className="lista-certificados">
                    {datosAlumno.certificados && datosAlumno.certificados.length > 0 ? (
                      datosAlumno.certificados.map((c, i) => (
                        <div key={i} className="item-certificado">
                          <div className="certificado-medalla">🏅</div>
                          <div className="certificado-datos">
                            <h4>{c.nombre}</h4>
                            <div className="certificado-fecha">
                              Acreditado el: <strong>{c.fecha_obtencion || 'Registro ordinario'}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)' }}>No constan certificados expedidos en la matrícula actual.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 2: NOTAS */}
            {seccionActiva === 'notas' && (
              <div>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica destacada">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Nota Media de Corte</span>
                      <div className="metrica-icono">🎓</div>
                    </div>
                    <div className="metrica-valor">{datosAlumno.nota_media}</div>
                    <div className="barra-progreso-mini">
                      <div className="barra-progreso-fill gold" style={{ width: `${(datosAlumno.nota_media / 10) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Rango de Rendimiento</span>
                      <div className="metrica-icono">📊</div>
                    </div>
                    <div className="metrica-valor" style={{ fontSize: '1.6rem' }}>
                      {obtenerClaseEstado(datosAlumno.nota_media).texto}
                    </div>
                    <div className="metrica-subtexto">Calculado según el baremo oficial</div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Asignaturas Evaluadas</span>
                      <div className="metrica-icono">📖</div>
                    </div>
                    <div className="metrica-valor">
                      {datosAlumno.cursos ? datosAlumno.cursos.length : 0}
                    </div>
                    <div className="metrica-subtexto">Materias con actas abiertas</div>
                  </div>
                </div>

                <div className="tarjeta-blanca">
                  <div className="encabezado-bloque">
                    <h3>Desglose Oficial de Calificaciones por Asignatura</h3>
                  </div>

                  <div className="lista-notas">
                    {datosAlumno.cursos && datosAlumno.cursos.length > 0 ? (
                      datosAlumno.cursos.map((c, i) => {
                        const estadoNota = c.nota !== null && c.nota !== undefined
                          ? obtenerClaseEstado(c.nota)
                          : { texto: 'Pendiente', clase: 'notable' };

                        return (
                          <div key={i} className="item-nota">
                            <div className="item-nota-info">
                              <h4>{c.nombre}</h4>
                              <div className="item-nota-materia">
                                Departamento de {c.materia} · Periodo: {c.fecha_inicio || '-'} a {c.fecha_fin || '-'}
                              </div>
                            </div>
                            <div>
                              <span className={`nota-badge ${estadoNota.clase}`}>
                                {c.nota !== null && c.nota !== undefined ? `${c.nota} pts` : 'En curso'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: 'var(--text-muted)' }}>No hay calificaciones asignadas actualmente.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 3: CURSOS */}
            {seccionActiva === 'cursos' && (
              <div>
                <div className="encabezado-bloque" style={{ marginBottom: '1.5rem' }}>
                  <h3>Asignaturas y Cursos Matriculados</h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Total: <strong>{datosAlumno.cursos ? datosAlumno.cursos.length : 0} cursos</strong>
                  </span>
                </div>

                <div className="rejilla-cursos">
                  {datosAlumno.cursos && datosAlumno.cursos.length > 0 ? (
                    datosAlumno.cursos.map((c, i) => (
                      <div key={i} className="tarjeta-curso">
                        <div className="tarjeta-curso-top">
                          <span className="tarjeta-curso-tag">{c.materia}</span>
                          <h4>{c.nombre}</h4>
                          <div className="tarjeta-curso-fechas">
                            <div>📅 <strong>Inicio:</strong> {c.fecha_inicio || 'Octubre 2026'}</div>
                            <div>🏁 <strong>Conclusión:</strong> {c.fecha_fin || 'Junio 2027'}</div>
                          </div>
                        </div>

                        <div className="tarjeta-curso-bottom">
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calificación:</span>
                          <strong style={{ color: 'var(--navy-900)' }}>
                            {c.nota !== null && c.nota !== undefined ? `${c.nota} / 10` : 'En progreso'}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Actualmente no tienes asignaturas matriculadas.</p>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECCIÓN 4: INFORME DE RENDIMIENTO (WOW) */}
            {seccionActiva === 'informe' && (
              <div className="informe-analitico">
                <div className="informe-header-oficial">
                  <div>
                    <h3>Dictamen de Rendimiento y Progreso Curricular</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Secretaría Académica del Colegio Mayor Cibeles
                    </p>
                  </div>
                  <div className="informe-folio">
                    FOLIO: CM-2026-{datosAlumno.id}-EXP
                  </div>
                </div>

                <div className="rejilla-graficas-informe">
                  {/* Gráfica 1: Cumplimiento de Asistencia */}
                  <div className="caja-grafica-css">
                    <h4>📊 Cumplimiento de Asistencia y Participación</h4>
                    <div className="barras-comparativa">
                      <div>
                        <div className="barra-item-label">
                          <span>Asistencia registrada</span>
                          <span>{datosAlumno.asistencia}%</span>
                        </div>
                        <div className="barra-track">
                          <div
                            className="barra-fill-dinamica"
                            style={{
                              width: `${Math.min(datosAlumno.asistencia, 100)}%`,
                              background: 'linear-gradient(90deg, #10b981, #059669)'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="barra-item-label">
                          <span>Estándar institucional mínimo</span>
                          <span>85%</span>
                        </div>
                        <div className="barra-track">
                          <div
                            className="barra-fill-dinamica"
                            style={{ width: '85%', background: '#94a3b8' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfica 2: Rendimiento frente al grupo */}
                  <div className="caja-grafica-css">
                    <h4>📈 Rendimiento Evaluativo (Sobre 10)</h4>
                    <div className="barras-comparativa">
                      <div>
                        <div className="barra-item-label">
                          <span>Nota media del estudiante</span>
                          <span>{datosAlumno.nota_media} / 10</span>
                        </div>
                        <div className="barra-track">
                          <div
                            className="barra-fill-dinamica"
                            style={{
                              width: `${(datosAlumno.nota_media / 10) * 100}%`,
                              background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="barra-item-label">
                          <span>Media global del curso</span>
                          <span>7.4 / 10</span>
                        </div>
                        <div className="barra-track">
                          <div
                            className="barra-fill-dinamica"
                            style={{ width: '74%', background: '#3b82f6' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dictamen-pedagogico">
                  <h4>📜 Valoración Pedagógica Personalizada</h4>
                  <p>
                    El alumno <strong>{datosAlumno.nombre_apellidos}</strong> demuestra un progreso académico{' '}
                    <strong>{obtenerClaseEstado(datosAlumno.nota_media).texto.toLowerCase()}</strong> con un índice de regularidad
                    de asistencia de <strong>{datosAlumno.asistencia}%</strong> y <strong>{datosAlumno.trabajos_entregados}</strong> proyectos
                    entregados en plazo.
                  </p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    Recomendación de la Junta Docente: Mantener el ritmo en las materias analíticas y reforzar la participación en certámenes STEAM.
                  </p>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button
                    onClick={() => window.print()}
                    className="boton-primario"
                  >
                    🖨️ Imprimir Dictamen Oficial
                  </button>
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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
        <h2>Panel de {rolTitulo}</h2>
        <p className="mensaje-destacado">
          Sesión activa: <strong>{usuario.nombre}</strong> ({rolTitulo})
        </p>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          El módulo de gestión docente y administración directiva se habilitará en la siguiente fase de desarrollo.
        </p>
        <button onClick={onCerrarSesion} className="boton-primario">
          Cerrar Sesión
        </button>
      </div>
    </main>
  );
}

// ========================================================
// COMPONENTE: PIE DE PÁGINA INSTITUCIONAL
// ========================================================
function PiePagina() {
  return (
    <footer className="pie-pagina">
      <div className="contenedor-pie">
        <div className="pie-branding">
          <h3>Colegio Mayor Cibeles · Madrid</h3>
          <p>Compromiso con la excelencia, la ética humanista y la innovación pedagógica.</p>
        </div>
        <div className="pie-enlaces">
          <div>Distrito Retiro, Madrid</div>
          <span>•</span>
          <div>Acreditación Oficial CAM</div>
          <span>•</span>
          <div>Secretaría Académica</div>
        </div>
      </div>
      <div className="pie-creditos">
        © 2026 Colegio Mayor Cibeles. Todos los derechos reservados. Sistema de Gestión Integral de Estudiantes.
      </div>
    </footer>
  );
}

// ========================================================
// COMPONENTE PRINCIPAL APP
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

      {!usuario && (
        <VistaPublica onAbrirLogin={() => setModalLoginAbierto(true)} />
      )}

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
