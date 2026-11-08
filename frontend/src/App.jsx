import { useState, useEffect, useRef } from 'react';

// URL base de la API FastAPI.
const API_BASE = 'http://127.0.0.1:8000';

function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerClaseEstado(nota) {
  if (nota === null || nota === undefined) return { texto: 'Pendiente', clase: 'notable' };
  const num = parseFloat(nota);
  if (num >= 9) return { texto: 'Sobresaliente', clase: 'excelente' };
  if (num >= 7) return { texto: 'Notable', clase: 'notable' };
  if (num >= 5) return { texto: 'Aprobado', clase: 'aprobado' };
  return { texto: 'En refuerzo', clase: 'aprobado' };
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

// Credenciales oficiales de prueba sincronizadas con CREDENCIALES_PRUEBA.md y postgreSQL
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
// COMPONENTE: CHATBOT ASISTENTE IA (GOOGLE GEMINI)
// ========================================================
function ChatbotDrawer({ abierto, onCerrar, usuario, tituloPersonalizado }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const finMensajesRef = useRef(null);
  const inputRef = useRef(null);

  const rol = usuario?.rol || (usuario?.matricula_id ? 'alumno' : 'usuario');
  const primerNombre = usuario?.nombre ? usuario.nombre.split(' ')[0] : 'Usuario';

  // Mensaje de bienvenida inicial según el rol del usuario
  useEffect(() => {
    let saludo = `👋 ¡Hola, ${primerNombre}! Soy tu asistente educativo con Inteligencia Artificial. ¿En qué puedo ayudarte hoy?`;
    if (rol === 'profesor') {
      saludo = `👋 ¡Hola, profesor/a ${primerNombre}! 📚 Soy tu copiloto pedagógico con Inteligencia Artificial.\n\nPuedo ayudarte a diseñar dinámicas de clase, elaborar rúbricas de evaluación, proponer ejercicios o redactar sugerencias didácticas.`;
    } else if (rol === 'director') {
      saludo = `👋 Saludos, ${primerNombre}. 🏛️ Soy tu asistente directivo e institucional con Inteligencia Artificial.\n\nPuedo asistirte en la redacción de circulares, planificación estratégica o dudas de gestión educativa.`;
    }

    setMensajes([
      {
        id: 'bienvenida',
        emisor: 'ia',
        texto: saludo,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [usuario, rol, primerNombre]);

  // Auto-scroll al final al recibir o enviar un mensaje
  useEffect(() => {
    if (abierto) {
      finMensajesRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [mensajes, abierto, cargando]);

  // Preguntas sugeridas contextuales según el rol
  const sugerencias = rol === 'alumno'
    ? [
        '💡 Consejos para organizar mi tiempo de estudio',
        '📝 ¿Cómo preparar un examen eficazmente?',
        '📖 Explícame un concepto de matemáticas de forma sencilla'
      ]
    : rol === 'profesor'
    ? [
        '🎯 Ideas para motivar la participación en el aula',
        '📋 Estructura recomendada para una rúbrica de evaluación',
        '💡 Estrategias didácticas para alumnos en refuerzo'
      ]
    : [
        '📢 Redactar una circular informativa para el centro',
        '📊 Ideas para optimizar la coordinación docente',
        '🏛️ Plan de bienvenida y convivencia escolar'
      ];

  async function enviarPregunta(textoEnviar) {
    const consulta = (textoEnviar || texto).trim();
    if (!consulta || cargando) return;

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Añadir mensaje del usuario
    const nuevoMensajeUsuario = {
      id: Date.now(),
      emisor: 'usuario',
      texto: consulta,
      hora: horaActual
    };

    setMensajes(prev => [...prev, nuevoMensajeUsuario]);
    setTexto('');
    setCargando(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mensaje: consulta })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error del servidor (${res.status})`);
      }

      const data = await res.json();
      const horaRespuesta = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMensajes(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'ia',
          texto: data.respuesta || 'Sin respuesta del modelo.',
          hora: horaRespuesta
        }
      ]);
    } catch (err) {
      console.error('Error al comunicarse con el chatbot:', err);
      const horaError = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMensajes(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          emisor: 'ia',
          esError: true,
          texto: `⚠️ No se pudo obtener respuesta: ${err.message}. Comprueba que el backend tenga configurada la clave GEMINI_API_KEY en backend/.env.`,
          hora: horaError
        }
      ]);
    } finally {
      setCargando(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    enviarPregunta();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarPregunta();
    }
  }

  function limpiarHistorial() {
    setMensajes([
      {
        id: Date.now(),
        emisor: 'ia',
        texto: '✨ Conversación reiniciada. ¿Qué otra duda o tema te gustaría consultar?',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }

  const tituloCabecera = tituloPersonalizado || (
    rol === 'director' ? '🏛️ Copiloto IA Dirección' :
    rol === 'profesor' ? '✨ Copiloto IA Docente' :
    '🎓 Asistente IA Estudiantil'
  );

  return (
    <>
      <div
        className={`drawer-chat-overlay ${abierto ? 'abierto' : ''}`}
        onClick={onCerrar}
      />
      <aside className={`drawer-chat-ia ${abierto ? 'abierto' : ''}`}>
        <div className="drawer-chat-cabecera">
          <div className="drawer-chat-titulo">
            <h3>{tituloCabecera}</h3>
            <span className="badge-ia-activa">Google Gemini</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={limpiarHistorial}
              className="btn-cerrar"
              title="Reiniciar conversación"
              style={{ color: '#ffffff', opacity: 0.85, fontSize: '1rem', cursor: 'pointer' }}
            >
              🔄
            </button>
            <button onClick={onCerrar} className="btn-cerrar" style={{ color: '#ffffff' }} title="Cerrar chat">
              &times;
            </button>
          </div>
        </div>

        <div className="drawer-chat-cuerpo">
          {mensajes.map((msg) => (
            <div
              key={msg.id}
              className={`chat-burbuja ${msg.emisor === 'usuario' ? 'usuario' : 'ia'} ${msg.esError ? 'chat-error' : ''}`}
            >
              <div className="chat-burbuja-contenido">
                {msg.texto.split('\n').map((linea, idx) => (
                  <p key={idx} style={{ margin: idx === 0 ? 0 : '0.4rem 0 0 0' }}>
                    {linea}
                  </p>
                ))}
              </div>
              {msg.hora && (
                <span className="chat-burbuja-hora">
                  {msg.hora}
                </span>
              )}
            </div>
          ))}

          {cargando && (
            <div className="chat-burbuja ia chat-pensando">
              <span className="spinner-ia"></span>
              <span>Consultando a Gemini...</span>
            </div>
          )}

          <div ref={finMensajesRef} />
        </div>

        {/* Sugerencias rápidas cuando el chat apenas inicia */}
        {mensajes.length <= 2 && !cargando && (
          <div className="chat-sugerencias-contenedor">
            <span className="chat-sugerencias-titulo">💡 Sugerencias rápidas:</span>
            <div className="chat-chips-lista">
              {sugerencias.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="chat-chip"
                  onClick={() => enviarPregunta(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="drawer-chat-pie">
          <form onSubmit={handleSubmit} className="chat-input-formulario">
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={cargando}
              placeholder="Escribe tu mensaje para Gemini..."
              maxLength={4000}
            />
            <button
              type="submit"
              className="boton-primario"
              disabled={cargando || !texto.trim()}
              title="Enviar consulta"
              style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Enviar</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div className="chat-pie-aviso">
            <span>⚡ Google Gemini API · Asistencia académica en tiempo real</span>
          </div>
        </div>
      </aside>
    </>
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
// COMPONENTE: MODAL EXPEDIENTE DE ALUMNO (VISTA PROFESOR)
// ========================================================
function ModalExpedienteAlumnoDocente({ alumnoId, cursoNombre, usuario, onCerrar, onIrACalificar }) {
  const [datosAlumno, setDatosAlumno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarExpediente() {
      setCargando(true);
      setError('');
      try {
        const url = `${API_BASE}/alumnos/${alumnoId}?usuario_nombre=${encodeURIComponent(usuario.nombre)}&usuario_contrasena=${encodeURIComponent(usuario.contrasena)}&usuario_rol=${encodeURIComponent(usuario.rol || 'profesor')}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'No se pudo cargar el expediente del alumno.');
        }
        const data = await res.json();
        setDatosAlumno(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }

    if (alumnoId) {
      cargarExpediente();
    }
  }, [alumnoId, usuario]);

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '720px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Expediente Oficial del Alumno</h2>
            <p>Consulta docente autorizada · Asignatura: {cursoNombre || 'Asignatura activa'}</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar" title="Cerrar modal">&times;</button>
        </div>

        <div className="modal-expediente-cuerpo">
          {cargando && (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p style={{ color: 'var(--navy-700)', fontWeight: '600' }}>
                ⏳ Cargando expediente académico verificado...
              </p>
            </div>
          )}

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {!cargando && datosAlumno && (
            <div>
              <div className="modal-expediente-cabecera">
                <div className="avatar-alumno-docente" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }}>
                  {datosAlumno.nombre_apellidos ? datosAlumno.nombre_apellidos.charAt(0) : 'A'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--navy-900)' }}>{datosAlumno.nombre_apellidos}</h3>
                  <div className="matricula-id">Expediente ID: #{datosAlumno.id} · Matrícula Ordinaria</div>
                  <span className={`nota-badge ${obtenerClaseEstado(datosAlumno.nota_media).clase}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                    Media Global: {datosAlumno.nota_media} pts ({obtenerClaseEstado(datosAlumno.nota_media).texto})
                  </span>
                </div>
              </div>

              {/* Fila de métricas del alumno */}
              <div className="metricas-fila" style={{ marginBottom: '1.5rem' }}>
                <div className="tarjeta-metrica">
                  <div className="metrica-header">
                    <span className="metrica-titulo">Asistencia Oficial</span>
                    <div className="metrica-icono">📅</div>
                  </div>
                  <div className="metrica-valor">{datosAlumno.asistencia}%</div>
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
                  <div className="metrica-subtexto">Proyectos registrados</div>
                </div>

                <div className="tarjeta-metrica destacada">
                  <div className="metrica-header">
                    <span className="metrica-titulo">Nota Media</span>
                    <div className="metrica-icono">🎓</div>
                  </div>
                  <div className="metrica-valor">{datosAlumno.nota_media}</div>
                  <div className="metrica-subtexto">Calificación global</div>
                </div>
              </div>

              {/* Cursos del alumno */}
              <div className="tarjeta-blanca" style={{ marginBottom: '1.2rem', padding: '1.2rem' }}>
                <h4 style={{ color: 'var(--navy-900)', marginBottom: '0.8rem' }}>📚 Asignaturas Matriculadas</h4>
                <div className="lista-notas">
                  {datosAlumno.cursos && datosAlumno.cursos.length > 0 ? (
                    datosAlumno.cursos.map((c, idx) => (
                      <div key={idx} className="item-nota" style={{ padding: '0.75rem 0.5rem' }}>
                        <div className="item-nota-info">
                          <h4 style={{ fontSize: '0.95rem' }}>{c.nombre}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Departamento: {c.materia}
                          </span>
                        </div>
                        <span className={`nota-badge ${obtenerClaseEstado(c.nota).clase}`}>
                          {c.nota !== null && c.nota !== undefined ? `${c.nota} pts` : 'Sin calificar'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No constan materias registradas.</p>
                  )}
                </div>
              </div>

              {/* Certificados */}
              <div className="tarjeta-blanca" style={{ padding: '1.2rem' }}>
                <h4 style={{ color: 'var(--navy-900)', marginBottom: '0.8rem' }}>🏆 Certificaciones Oficiales</h4>
                {datosAlumno.certificados && datosAlumno.certificados.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {datosAlumno.certificados.map((cert, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', fontSize: '0.88rem' }}>
                        <span>🏅</span>
                        <div>
                          <strong>{cert.nombre}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                            ({cert.fecha_obtencion || 'Expedición institucional'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin certificaciones adicionales emitidas.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="acciones-formulario" style={{ marginTop: '1.2rem', display: 'flex', justifyContent: onIrACalificar ? 'space-between' : 'flex-end' }}>
          {onIrACalificar && (
            <button
              type="button"
              className="boton-dorado"
              onClick={() => {
                onCerrar();
                onIrACalificar(alumnoId);
              }}
            >
              ✏️ Modificar Nota de este Alumno
            </button>
          )}
          <button type="button" onClick={onCerrar} className="boton-secundario">
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}

// Horarios y aulas representativas según la materia
function obtenerHorarioCurso(materia, nombre) {
  const m = (materia || '').toLowerCase();
  const n = (nombre || '').toLowerCase();
  if (m.includes('mate') || n.includes('mate') || n.includes('álgebra') || n.includes('algebra')) {
    return { horario: 'Lunes y Miércoles 09:30 - 11:30', aula: 'Aula 204 · Pabellón Central' };
  }
  if (m.includes('python') || m.includes('informát') || n.includes('python') || n.includes('software')) {
    return { horario: 'Martes y Jueves 11:45 - 13:45', aula: 'Laboratorio STEAM Lab 1' };
  }
  if (m.includes('físic') || m.includes('fisic') || m.includes('quím')) {
    return { horario: 'Miércoles y Viernes 08:30 - 10:30', aula: 'Laboratorio de Ciencias 3' };
  }
  if (m.includes('historia') || m.includes('letras')) {
    return { horario: 'Martes y Jueves 10:00 - 12:00', aula: 'Aula de Humanidades 102' };
  }
  return { horario: 'Lunes y Jueves 12:00 - 14:00', aula: 'Aula Polivalente Cibeles' };
}

// ========================================================
// COMPONENTE: PANEL PRIVADO DEL PROFESOR
// ========================================================
function VistaProfesor({ usuario, onCerrarSesion }) {
  // Pestañas: 'rendimiento' (inicio), 'cursos', 'alumnos', 'calificaciones'
  const [seccionActiva, setSeccionActiva] = useState('rendimiento');
  const [chatIaAbierto, setChatIaAbierto] = useState(false);
  const [datosPanel, setDatosPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Filtros de búsqueda en Alumnos y Calificaciones
  const [filtroCurso, setFiltroCurso] = useState('todos');
  const [busquedaAlumno, setBusquedaAlumno] = useState('');

  // Modal para ver datos del alumno
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  // Estados para modificación de notas
  const [notasEditadas, setNotasEditadas] = useState({});
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Cargar datos del panel docente
  async function cargarDatos() {
    setCargando(true);
    setError('');
    try {
      const url = `${API_BASE}/profesores/${usuario.id}/panel?usuario_nombre=${encodeURIComponent(usuario.nombre)}&usuario_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al obtener datos del panel docente.');
      }
      const data = await res.json();
      setDatosPanel(data);

      // Inicializar el diccionario de notas con los valores actuales
      const notasIniciales = {};
      if (data.alumnos) {
        data.alumnos.forEach((a) => {
          notasIniciales[`${a.alumno_id}_${a.curso_id}`] = a.nota !== null && a.nota !== undefined ? a.nota : '';
        });
      }
      setNotasEditadas(notasIniciales);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (usuario && usuario.id) {
      cargarDatos();
    }
  }, [usuario]);

  // Manejar cambio en el input de nota
  function handleCambioNota(alumnoId, cursoId, valor) {
    setNotasEditadas((prev) => ({
      ...prev,
      [`${alumnoId}_${cursoId}`]: valor
    }));
  }

  // Guardar nota modificada en la base de datos
  async function handleGuardarNota(alumnoId, cursoId, alumnoNombre, cursoNombre) {
    const clave = `${alumnoId}_${cursoId}`;
    const valorNota = parseFloat(notasEditadas[clave]);

    if (isNaN(valorNota) || valorNota < 0 || valorNota > 10) {
      alert('Por favor, introduce una nota numérica válida entre 0 y 10.');
      return;
    }

    setGuardandoNota(true);
    setMensajeExito('');
    try {
      const res = await fetch(`${API_BASE}/profesores/calificar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: usuario.id,
          alumno_id: alumnoId,
          curso_id: cursoId,
          nota: valorNota,
          usuario_nombre: usuario.nombre,
          usuario_contrasena: usuario.contrasena
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'No se pudo guardar la calificación.');
      }

      setMensajeExito(`Nota de ${alumnoNombre} actualizada a ${valorNota} pts con éxito en ${cursoNombre}.`);
      setTimeout(() => setMensajeExito(''), 4000);

      // Recargar datos para actualizar estadísticas y medias
      cargarDatos();
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setGuardandoNota(false);
    }
  }

  // Filtrado de alumnos
  const alumnosFiltrados = (datosPanel?.alumnos || []).filter((a) => {
    const coincideCurso = filtroCurso === 'todos' || String(a.curso_id) === String(filtroCurso);
    const coincideTexto = (a.nombre_apellidos || '').toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
                          (a.curso_nombre || '').toLowerCase().includes(busquedaAlumno.toLowerCase());
    return coincideCurso && coincideTexto;
  });

  const primerNombre = usuario.nombre ? usuario.nombre.split(' ')[0] : 'Profesor';

  return (
    <div className="panel-privado">
      {/* DESPLEGABLE IZQUIERDO: CHAT CON IA (GOOGLE GEMINI) */}
      <ChatbotDrawer
        abierto={chatIaAbierto}
        onCerrar={() => setChatIaAbierto(false)}
        usuario={{ ...usuario, rol: 'profesor' }}
        tituloPersonalizado="✨ Copiloto IA Docente"
      />

      {/* BARRA LATERAL (IDÉNTICA EN ESTRUCTURA A LA DE ALUMNOS) */}
      <aside className="barra-lateral">
        <div className="perfil-lateral">
          <div className="avatar-alumno-wrapper">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
              alt="Avatar del Docente"
              className="avatar-alumno"
              style={{ borderColor: 'var(--gold-400)' }}
            />
            <div className="insignia-verificado" title="Docente Oficial Colegiado">✓</div>
          </div>
          <h3>{usuario.nombre}</h3>
          <div className="matricula-id">Docente ID: #{usuario.id}</div>
          <span className="etiqueta-rol">Profesor Titular</span>
        </div>

        {/* BOTÓN PARA DESPLEGAR EL CHAT CON IA */}
        <button
          type="button"
          className="btn-chat-ia-toggle"
          onClick={() => setChatIaAbierto(true)}
          title="Hablar con el Asistente IA"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🤖</span>
            <span>Chat Asistente IA</span>
          </div>
          <span className="badge-ia-activa">Gemini</span>
        </button>

        {/* MENÚ LATERAL CON LOS 4 APARTADOS PEDIDOS */}
        <nav className="menu-navegacion">
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'rendimiento' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('rendimiento')}
          >
            <span className="btn-nav-icono">📊</span> Rendimiento de Alumnos
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
            className={`btn-nav ${seccionActiva === 'alumnos' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('alumnos')}
          >
            <span className="btn-nav-icono">👥</span> Alumnos
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'calificaciones' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('calificaciones')}
          >
            <span className="btn-nav-icono">✍️</span> Modificar Notas
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

      {/* CONTENIDO PRINCIPAL DEL PROFESOR */}
      <section className="contenido-alumno">
        {/* Banner de saludo docente */}
        <div className="banner-bienvenida-alumno">
          <div className="banner-alumno-textos">
            <h2>Panel Docente de {primerNombre}</h2>
            <p>Supervisión curricular, gestión evaluativa de actas y seguimiento del rendimiento de tus alumnos.</p>
          </div>
          <div className="banner-alumno-periodo">
            Curso Académico 2026/2027
          </div>
        </div>

        {cargando && (
          <div className="tarjeta-blanca" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--navy-700)', fontWeight: '600' }}>
              ⏳ Cargando asignaturas y expedientes de tus alumnos...
            </p>
          </div>
        )}

        {error && (
          <div className="alerta-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {mensajeExito && (
          <div className="alerta-exito-flotante">
            <span>✅</span> {mensajeExito}
          </div>
        )}

        {!cargando && datosPanel && (
          <>
            {/* ========================================================
               APARTADO 1 (INICIO): RENDIMIENTO DE LOS ALUMNOS
               ======================================================== */}
            {seccionActiva === 'rendimiento' && (
              <div>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica destacada">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Promedio Global</span>
                      <div className="metrica-icono">🏆</div>
                    </div>
                    <div className="metrica-valor">
                      {datosPanel.estadisticas.promedio_global}{' '}
                      <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>/ 10</span>
                    </div>
                    <div className="metrica-subtexto">
                      Rango: <strong>{obtenerClaseEstado(datosPanel.estadisticas.promedio_global).texto}</strong>
                    </div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill gold"
                        style={{ width: `${(datosPanel.estadisticas.promedio_global / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Tasa de Aprobados</span>
                      <div className="metrica-icono">📈</div>
                    </div>
                    <div className="metrica-valor">{datosPanel.estadisticas.tasa_aprobados}%</div>
                    <div className="metrica-subtexto">Alumnos con calificación &ge; 5.0</div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill emerald"
                        style={{ width: `${Math.min(datosPanel.estadisticas.tasa_aprobados, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Asistencia Media</span>
                      <div className="metrica-icono">📅</div>
                    </div>
                    <div className="metrica-valor">{datosPanel.estadisticas.asistencia_media}%</div>
                    <div className="metrica-subtexto">Regularidad en aula</div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill"
                        style={{ width: `${Math.min(datosPanel.estadisticas.asistencia_media, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Alumnos a Cargo</span>
                      <div className="metrica-icono">👥</div>
                    </div>
                    <div className="metrica-valor">{datosPanel.estadisticas.total_alumnos}</div>
                    <div className="metrica-subtexto">
                      En {datosPanel.estadisticas.total_cursos} curso{datosPanel.estadisticas.total_cursos !== 1 ? 's' : ''} asignado{datosPanel.estadisticas.total_cursos !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Resumen por Asignatura */}
                <div className="tarjeta-blanca" style={{ marginBottom: '1.5rem' }}>
                  <div className="encabezado-bloque">
                    <h3>📊 Rendimiento Evaluativo por Asignatura Impartida</h3>
                  </div>

                  <div className="lista-notas">
                    {datosPanel.cursos && datosPanel.cursos.length > 0 ? (
                      datosPanel.cursos.map((c, i) => (
                        <div key={i} className="item-nota">
                          <div className="item-nota-info">
                            <h4>{c.nombre}</h4>
                            <div className="item-nota-materia">
                              Departamento de {c.materia} · {c.total_alumnos} alumno{c.total_alumnos !== 1 ? 's' : ''} matriculado{c.total_alumnos !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Media del curso:</div>
                              <strong style={{ color: 'var(--navy-900)', fontSize: '1.05rem' }}>
                                {c.nota_media} / 10
                              </strong>
                            </div>
                            <span className={`nota-badge ${obtenerClaseEstado(c.nota_media).clase}`}>
                              {obtenerClaseEstado(c.nota_media).texto}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)' }}>No tienes cursos asignados actualmente.</p>
                    )}
                  </div>
                </div>

                {/* Bloque pedagógico de seguimiento */}
                <div className="dictamen-pedagogico">
                  <h4>📜 Diagnóstico Docente y Seguimiento</h4>
                  <p>
                    Tus grupos presentan un índice de asistencia regular del <strong>{datosPanel.estadisticas.asistencia_media}%</strong>{' '}
                    y un porcentaje de superación curricular del <strong>{datosPanel.estadisticas.tasa_aprobados}%</strong>.
                  </p>
                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="boton-primario"
                      onClick={() => setSeccionActiva('calificaciones')}
                    >
                      ✍️ Ir a Calificar y Modificar Notas
                    </button>
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => setChatIaAbierto(true)}
                    >
                      🤖 Consultar Asistente IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 2: CURSOS Y HORARIOS
               ======================================================== */}
            {seccionActiva === 'cursos' && (
              <div>
                <div className="encabezado-bloque" style={{ marginBottom: '1.5rem' }}>
                  <h3>Cursos y Horarios Asignados</h3>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Total: <strong>{datosPanel.cursos ? datosPanel.cursos.length : 0} asignaturas</strong>
                  </span>
                </div>

                <div className="rejilla-cursos">
                  {datosPanel.cursos && datosPanel.cursos.length > 0 ? (
                    datosPanel.cursos.map((c, i) => {
                      const datosHorario = obtenerHorarioCurso(c.materia, c.nombre);
                      return (
                        <div key={i} className="tarjeta-curso">
                          <div className="tarjeta-curso-top">
                            <span className="tarjeta-curso-tag">{c.materia}</span>
                            <h4>{c.nombre}</h4>
                            <div className="tarjeta-curso-fechas">
                              <div>📅 <strong>Horario:</strong> {datosHorario.horario}</div>
                              <div>🏛️ <strong>Ubicación:</strong> {datosHorario.aula}</div>
                              <div>👥 <strong>Alumnado:</strong> {c.total_alumnos} estudiantes matriculados</div>
                            </div>
                          </div>

                          <div className="tarjeta-curso-bottom" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calificación media:</span>
                              <strong style={{ color: 'var(--navy-900)' }}>{c.nota_media} / 10</strong>
                            </div>
                            <button
                              type="button"
                              className="boton-secundario"
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem' }}
                              onClick={() => {
                                setFiltroCurso(String(c.id));
                                setSeccionActiva('alumnos');
                              }}
                            >
                              👥 Ver Alumnos de este Curso
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No tienes cursos asignados actualmente.</p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 3: ALUMNOS (CON APERTURA DE EXPEDIENTE)
               ======================================================== */}
            {seccionActiva === 'alumnos' && (
              <div>
                <div className="encabezado-bloque" style={{ marginBottom: '1.2rem' }}>
                  <h3>Listado de Alumnos en tus Asignaturas</h3>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Total filtrado: <strong>{alumnosFiltrados.length} alumnos</strong>
                  </span>
                </div>

                {/* Filtros */}
                <div className="barra-filtros-docente">
                  <div className="input-busqueda-docente">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre de alumno o curso..."
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                    />
                  </div>

                  <select
                    className="select-filtro-curso"
                    value={filtroCurso}
                    onChange={(e) => setFiltroCurso(e.target.value)}
                  >
                    <option value="todos">Todos los cursos</option>
                    {datosPanel.cursos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Rejilla de Alumnos */}
                <div className="rejilla-alumnos-docente">
                  {alumnosFiltrados.length > 0 ? (
                    alumnosFiltrados.map((a, i) => (
                      <div
                        key={i}
                        className="tarjeta-alumno-docente"
                        onClick={() => setAlumnoSeleccionado(a)}
                        title="Haz clic para abrir el expediente completo"
                      >
                        <div>
                          <div className="alumno-docente-header">
                            <div className="avatar-alumno-docente">
                              {a.nombre_apellidos ? a.nombre_apellidos.charAt(0) : 'A'}
                            </div>
                            <div className="alumno-docente-info">
                              <h4>{a.nombre_apellidos}</h4>
                              <span>{a.curso_nombre}</span>
                            </div>
                          </div>

                          <div className="alumno-docente-stats">
                            <div className="stat-item">
                              <div className="stat-item-label">Asistencia</div>
                              <div className="stat-item-valor">{a.asistencia}%</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">Trabajos</div>
                              <div className="stat-item-valor">{a.trabajos_entregados}</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">Nota Asignatura</div>
                              <div className="stat-item-valor">
                                {a.nota !== null && a.nota !== undefined ? `${a.nota} pts` : 'Pendiente'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="alumno-docente-footer">
                          <span className={`nota-badge ${obtenerClaseEstado(a.nota).clase}`}>
                            {obtenerClaseEstado(a.nota).texto}
                          </span>
                          <button
                            type="button"
                            className="btn-ver-expediente"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAlumnoSeleccionado(a);
                            }}
                          >
                            <span>📋 Abrir Ficha</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="tarjeta-blanca" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                      <p style={{ color: 'var(--text-muted)' }}>
                        No se encontraron alumnos con los criterios de búsqueda aplicados.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 4: MODIFICAR NOTAS
               ======================================================== */}
            {seccionActiva === 'calificaciones' && (
              <div>
                <div className="encabezado-bloque" style={{ marginBottom: '1.2rem' }}>
                  <h3>Calificaciones Oficiales y Modificación de Actas</h3>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Introduce o actualiza la nota y pulsa "Guardar"
                  </span>
                </div>

                {/* Filtro por curso */}
                <div className="barra-filtros-docente">
                  <div className="input-busqueda-docente">
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Filtrar alumno por nombre..."
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                    />
                  </div>

                  <select
                    className="select-filtro-curso"
                    value={filtroCurso}
                    onChange={(e) => setFiltroCurso(e.target.value)}
                  >
                    <option value="todos">Todos los cursos</option>
                    {datosPanel.cursos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tabla de Modificación de Notas */}
                <div className="tabla-calificaciones-wrap">
                  <table className="tabla-calificaciones">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Asignatura</th>
                        <th>Asistencia</th>
                        <th>Nota Actual</th>
                        <th>Modificar Nota (0 - 10)</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosFiltrados.length > 0 ? (
                        alumnosFiltrados.map((a, i) => {
                          const clave = `${a.alumno_id}_${a.curso_id}`;
                          const valorInput = notasEditadas[clave] !== undefined ? notasEditadas[clave] : '';

                          return (
                            <tr key={i}>
                              <td>
                                <strong style={{ color: 'var(--navy-900)' }}>{a.nombre_apellidos}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{a.alumno_id}</div>
                              </td>
                              <td>
                                <div>{a.curso_nombre}</div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.curso_materia}</span>
                              </td>
                              <td>{a.asistencia}%</td>
                              <td>
                                <span className={`nota-badge ${obtenerClaseEstado(a.nota).clase}`}>
                                  {a.nota !== null && a.nota !== undefined ? `${a.nota} pts` : 'Sin calificar'}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="input-nota-edicion"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={valorInput}
                                  onChange={(e) => handleCambioNota(a.alumno_id, a.curso_id, e.target.value)}
                                  placeholder="0.0"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="boton-primario"
                                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                                  disabled={guardandoNota}
                                  onClick={() => handleGuardarNota(a.alumno_id, a.curso_id, a.nombre_apellidos, a.curso_nombre)}
                                >
                                  💾 Guardar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No hay alumnos registrados en el curso seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL DE APERTURA DE EXPEDIENTE DEL ALUMNO SELECCIONADO */}
      {alumnoSeleccionado && (
        <ModalExpedienteAlumnoDocente
          alumnoId={alumnoSeleccionado.alumno_id}
          cursoNombre={alumnoSeleccionado.curso_nombre}
          usuario={usuario}
          onCerrar={() => setAlumnoSeleccionado(null)}
          onIrACalificar={(alumnoId) => {
            setAlumnoSeleccionado(null);
            setSeccionActiva('calificaciones');
          }}
        />
      )}
    </div>
  );
}

// ========================================================
// COMPONENTE: MODAL DETALLE DE PROFESOR (VISTA DIRECTOR)
// ========================================================
function ModalDetalleProfesor({ profesorId, usuario, onCerrar }) {
  const [datosProfesor, setDatosProfesor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarProfesor() {
      setCargando(true);
      setError('');
      try {
        const url = `${API_BASE}/profesores/${profesorId}/detalle?director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'No se pudo cargar la información del profesor.');
        }
        const data = await res.json();
        setDatosProfesor(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }

    if (profesorId) {
      cargarProfesor();
    }
  }, [profesorId, usuario]);

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '680px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Ficha Oficial del Docente</h2>
            <p>Registro de claustro · Colegio Mayor Cibeles</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar" title="Cerrar modal">&times;</button>
        </div>

        <div className="modal-expediente-cuerpo">
          {cargando && (
            <div style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p style={{ color: 'var(--navy-700)', fontWeight: '600' }}>
                ⏳ Cargando asignaciones del profesor...
              </p>
            </div>
          )}

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {!cargando && datosProfesor && (
            <div>
              <div className="modal-expediente-cabecera">
                <div className="avatar-profesor-director" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }}>
                  {datosProfesor.nombre_apellidos ? datosProfesor.nombre_apellidos.charAt(0) : 'P'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--navy-900)' }}>{datosProfesor.nombre_apellidos}</h3>
                  <div className="matricula-id">ID Docente: #{datosProfesor.id} · Claustro Titular</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    📞 Contacto directo: <strong>{datosProfesor.telefono || 'No registrado'}</strong>
                  </div>
                </div>
              </div>

              <div className="tarjeta-blanca" style={{ padding: '1.2rem', marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--navy-900)', marginBottom: '0.8rem' }}>
                  📚 Cursos y Asignaturas Impartidas ({datosProfesor.cursos ? datosProfesor.cursos.length : 0})
                </h4>

                <div className="lista-notas">
                  {datosProfesor.cursos && datosProfesor.cursos.length > 0 ? (
                    datosProfesor.cursos.map((c, i) => (
                      <div key={i} className="item-nota">
                        <div className="item-nota-info">
                          <h4>{c.nombre}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Departamento de {c.materia} · {c.total_alumnos} alumno{c.total_alumnos !== 1 ? 's' : ''} matriculado{c.total_alumnos !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Media grupo</span>
                          <strong style={{ color: 'var(--navy-900)', fontSize: '1rem' }}>
                            {c.nota_media !== null && c.nota_media !== undefined ? `${c.nota_media} pts` : '-'}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tiene asignaturas asignadas actualmente.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="acciones-formulario" style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCerrar} className="boton-secundario">
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: MODAL CREAR ALUMNO (DIRECTOR)
// ========================================================
function ModalCrearAlumno({ estaAbierto, usuario, onCerrar, onAlumnoCreado }) {
  const [nombreApellidos, setNombreApellidos] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [asistencia, setAsistencia] = useState(100.0);
  const [notaMedia, setNotaMedia] = useState(0.0);
  const [trabajosEntregados, setTrabajosEntregados] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!estaAbierto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreApellidos.trim() || !contrasena.trim()) {
      setError('Por favor, completa los campos requeridos (nombre y contraseña).');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const url = `${API_BASE}/alumnos?director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_apellidos: nombreApellidos.trim(),
          contrasena: contrasena.trim(),
          asistencia: parseFloat(asistencia) || 100.0,
          nota_media: parseFloat(notaMedia) || 0.0,
          trabajos_entregados: parseInt(trabajosEntregados) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al dar de alta al alumno.');
      }

      onAlumnoCreado(data);
      onCerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '520px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Alta de Nuevo Alumno</h2>
            <p>Registro oficial de matrícula en la base de datos institucional</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar">&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="campo-formulario">
            <label>Nombre y Apellidos *</label>
            <input
              type="text"
              required
              placeholder="Ej. Martín Soler García"
              value={nombreApellidos}
              onChange={(e) => setNombreApellidos(e.target.value)}
            />
          </div>

          <div className="campo-formulario">
            <label>Contraseña de Acceso *</label>
            <input
              type="password"
              required
              placeholder="Contraseña para el portal del alumno"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
            <div className="campo-formulario">
              <label>Asistencia (%)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={asistencia}
                onChange={(e) => setAsistencia(e.target.value)}
              />
            </div>

            <div className="campo-formulario">
              <label>Nota Media</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={notaMedia}
                onChange={(e) => setNotaMedia(e.target.value)}
              />
            </div>

            <div className="campo-formulario">
              <label>Trabajos</label>
              <input
                type="number"
                min="0"
                value={trabajosEntregados}
                onChange={(e) => setTrabajosEntregados(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="acciones-formulario" style={{ marginTop: '1.5rem' }}>
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Registrar Alumno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: MODAL CREAR PROFESOR (DIRECTOR)
// ========================================================
function ModalCrearProfesor({ estaAbierto, usuario, onCerrar, onProfesorCreado }) {
  const [nombreApellidos, setNombreApellidos] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!estaAbierto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombreApellidos.trim() || !contrasena.trim()) {
      setError('Por favor, completa los campos requeridos (nombre y contraseña).');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const url = `${API_BASE}/profesores?director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_apellidos: nombreApellidos.trim(),
          contrasena: contrasena.trim(),
          telefono: telefono.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al dar de alta al profesor.');
      }

      onProfesorCreado(data);
      onCerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '520px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Alta de Nuevo Profesor</h2>
            <p>Incorporación oficial al claustro docente del centro</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar">&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="campo-formulario">
            <label>Nombre y Apellidos *</label>
            <input
              type="text"
              required
              placeholder="Ej. Dra. Carmen Mendoza Rios"
              value={nombreApellidos}
              onChange={(e) => setNombreApellidos(e.target.value)}
            />
          </div>

          <div className="campo-formulario">
            <label>Contraseña de Acceso *</label>
            <input
              type="password"
              required
              placeholder="Contraseña inicial para el docente"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          <div className="campo-formulario">
            <label>Teléfono de Contacto</label>
            <input
              type="tel"
              placeholder="Ej. 612 345 678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="acciones-formulario" style={{ marginTop: '1.5rem' }}>
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Registrar Profesor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: MODAL CREAR CERTIFICADO (DIRECTOR)
// ========================================================
function ModalCrearCertificado({ estaAbierto, usuario, onCerrar, onCertificadoCreado }) {
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!estaAbierto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Por favor, indica el nombre oficial del certificado.');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const authQuery = `director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      const res = await fetch(`${API_BASE}/certificados?${authQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al crear el certificado.');

      onCertificadoCreado(data);
      onCerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '480px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Nuevo Certificado Oficial</h2>
            <p>Acreditación o título homologado por el centro</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar">&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="campo-formulario">
            <label>Nombre del Certificado *</label>
            <input
              type="text"
              required
              placeholder="Ej. B2 First Certificate in English"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="acciones-formulario" style={{ marginTop: '1.5rem' }}>
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Creando...' : 'Crear Certificado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: MODAL ASIGNAR RELACIONES (DIRECTOR)
// ========================================================
function ModalAsignarRelacion({ estaAbierto, usuario, alumnos, profesores, cursos, certificados, onCerrar, onRelacionCreada }) {
  const [tipoRelacion, setTipoRelacion] = useState('alumno-curso'); // 'alumno-curso', 'profesor-curso', 'alumno-certificado'

  // Alumno a curso
  const [alumnoIdAC, setAlumnoIdAC] = useState('');
  const [cursoIdAC, setCursoIdAC] = useState('');
  const [fechaInicio, setFechaInicio] = useState('Octubre 2026');
  const [fechaFin, setFechaFin] = useState('Junio 2027');
  const [notaInicial, setNotaInicial] = useState('');

  // Profesor a curso
  const [profesorIdPC, setProfesorIdPC] = useState('');
  const [cursoIdPC, setCursoIdPC] = useState('');

  // Alumno a certificado
  const [alumnoIdCert, setAlumnoIdCert] = useState('');
  const [certificadoId, setCertificadoId] = useState('');
  const [fechaObtencion, setFechaObtencion] = useState('Noviembre 2026');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!estaAbierto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    setError('');

    const authQuery = `director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;

    try {
      let endpoint = '';
      let payload = {};
      let msgExito = '';

      if (tipoRelacion === 'alumno-curso') {
        if (!alumnoIdAC || !cursoIdAC) throw new Error('Selecciona un alumno y un curso.');
        endpoint = `${API_BASE}/asignar/alumno-curso?${authQuery}`;
        payload = {
          alumno_id: parseInt(alumnoIdAC),
          curso_id: parseInt(cursoIdAC),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          nota: parseFloat(notaInicial) || 0.0
        };
        msgExito = 'Alumno matriculado en el curso con éxito.';
      } else if (tipoRelacion === 'profesor-curso') {
        if (!profesorIdPC || !cursoIdPC) throw new Error('Selecciona un profesor y un curso.');
        endpoint = `${API_BASE}/asignar/profesor-curso?${authQuery}`;
        payload = {
          profesor_id: parseInt(profesorIdPC),
          curso_id: parseInt(cursoIdPC)
        };
        msgExito = 'Profesor asignado al curso con éxito.';
      } else if (tipoRelacion === 'alumno-certificado') {
        if (!alumnoIdCert || !certificadoId) throw new Error('Selecciona un alumno y un certificado.');
        endpoint = `${API_BASE}/asignar/alumno-certificado?${authQuery}`;
        payload = {
          alumno_id: parseInt(alumnoIdCert),
          certificado_id: parseInt(certificadoId),
          fecha_obtencion: fechaObtencion
        };
        msgExito = 'Certificado otorgado al alumno con éxito.';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar la asignación.');

      onRelacionCreada(msgExito);
      onCerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onCerrar(); }}>
      <div className="modal-contenido" style={{ maxWidth: '580px' }}>
        <div className="modal-cabecera">
          <div className="modal-cabecera-texto">
            <h2>Asignaciones y Relaciones Académicas</h2>
            <p>Vincular alumnos, profesores, asignaturas y certificaciones</p>
          </div>
          <button onClick={onCerrar} className="btn-cerrar">&times;</button>
        </div>

        {/* SELECTOR DE TIPO DE RELACIÓN */}
        <div className="selector-relaciones-segmentado" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className={`btn-opcion-relacion ${tipoRelacion === 'alumno-curso' ? 'activo' : ''}`}
            onClick={() => setTipoRelacion('alumno-curso')}
          >
            🎓 Alumno ↔ Curso
          </button>
          <button
            type="button"
            className={`btn-opcion-relacion ${tipoRelacion === 'profesor-curso' ? 'activo' : ''}`}
            onClick={() => setTipoRelacion('profesor-curso')}
          >
            👨‍🏫 Profesor ↔ Curso
          </button>
          <button
            type="button"
            className={`btn-opcion-relacion ${tipoRelacion === 'alumno-certificado' ? 'activo' : ''}`}
            onClick={() => setTipoRelacion('alumno-certificado')}
          >
            🏆 Alumno ↔ Certificado
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tipoRelacion === 'alumno-curso' && (
            <div>
              <div className="campo-formulario">
                <label>Seleccionar Alumno *</label>
                <select
                  required
                  value={alumnoIdAC}
                  onChange={(e) => setAlumnoIdAC(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un alumno --</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre_apellidos} (ID #{a.id})</option>
                  ))}
                </select>
              </div>

              <div className="campo-formulario">
                <label>Seleccionar Curso / Asignatura *</label>
                <select
                  required
                  value={cursoIdAC}
                  onChange={(e) => setCursoIdAC(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un curso --</option>
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.materia})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div className="campo-formulario">
                  <label>Fecha Inicio</label>
                  <input type="text" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className="campo-formulario">
                  <label>Fecha Fin</label>
                  <input type="text" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
                <div className="campo-formulario">
                  <label>Nota Inicial (opc.)</label>
                  <input type="number" step="0.1" min="0" max="10" placeholder="0.0" value={notaInicial} onChange={(e) => setNotaInicial(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {tipoRelacion === 'profesor-curso' && (
            <div>
              <div className="campo-formulario">
                <label>Seleccionar Profesor *</label>
                <select
                  required
                  value={profesorIdPC}
                  onChange={(e) => setProfesorIdPC(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un profesor --</option>
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre_apellidos} (ID #{p.id})</option>
                  ))}
                </select>
              </div>

              <div className="campo-formulario">
                <label>Seleccionar Curso / Asignatura *</label>
                <select
                  required
                  value={cursoIdPC}
                  onChange={(e) => setCursoIdPC(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un curso --</option>
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.materia})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tipoRelacion === 'alumno-certificado' && (
            <div>
              <div className="campo-formulario">
                <label>Seleccionar Alumno *</label>
                <select
                  required
                  value={alumnoIdCert}
                  onChange={(e) => setAlumnoIdCert(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un alumno --</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre_apellidos} (ID #{a.id})</option>
                  ))}
                </select>
              </div>

              <div className="campo-formulario">
                <label>Seleccionar Certificado *</label>
                <select
                  required
                  value={certificadoId}
                  onChange={(e) => setCertificadoId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">-- Elige un certificado --</option>
                  {certificados.map((cert) => (
                    <option key={cert.id} value={cert.id}>{cert.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="campo-formulario">
                <label>Fecha de Obtención</label>
                <input type="text" value={fechaObtencion} onChange={(e) => setFechaObtencion(e.target.value)} />
              </div>
            </div>
          )}

          {error && (
            <div className="alerta-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="acciones-formulario" style={{ marginTop: '1.5rem' }}>
            <button type="button" onClick={onCerrar} className="boton-secundario" disabled={cargando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={cargando}>
              {cargando ? 'Guardando Asignación...' : 'Guardar Asignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// COMPONENTE: PANEL PRIVADO DEL DIRECTOR
// ========================================================
function VistaDirector({ usuario, onCerrarSesion }) {
  // Pestañas: 'estadisticas' (inicio), 'cursos', 'alumnos', 'profesores', 'certificados', 'logs'
  const [seccionActiva, setSeccionActiva] = useState('estadisticas');
  const [chatIaAbierto, setChatIaAbierto] = useState(false);

  // Datos globales
  const [datosPanel, setDatosPanel] = useState(null);
  const [listaAlumnos, setListaAlumnos] = useState([]);
  const [listaProfesores, setListaProfesores] = useState([]);
  const [listaCertificados, setListaCertificados] = useState([]);
  const [listaLogs, setListaLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Buscadores
  const [busquedaCursos, setBusquedaCursos] = useState('');
  const [busquedaAlumnos, setBusquedaAlumnos] = useState('');
  const [busquedaProfesores, setBusquedaProfesores] = useState('');
  const [busquedaCertificados, setBusquedaCertificados] = useState('');

  // Detalle de curso seleccionado (vista profunda)
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState(null);
  const [datosDetalleCurso, setDatosDetalleCurso] = useState(null);
  const [cargandoDetalleCurso, setCargandoDetalleCurso] = useState(false);

  // Modales
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState(null);
  const [profesorSeleccionadoId, setProfesorSeleccionadoId] = useState(null);
  const [modalCrearAlumnoAbierto, setModalCrearAlumnoAbierto] = useState(false);
  const [modalCrearProfesorAbierto, setModalCrearProfesorAbierto] = useState(false);
  const [modalCrearCertificadoAbierto, setModalCrearCertificadoAbierto] = useState(false);
  const [modalRelacionAbierto, setModalRelacionAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Carga general del panel del director
  async function cargarDatosDirector() {
    setCargando(true);
    setError('');
    try {
      const authQuery = `director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      
      const [resPanel, resAlumnos, resProfesores, resCertificados, resLogs] = await Promise.all([
        fetch(`${API_BASE}/director/panel?${authQuery}`),
        fetch(`${API_BASE}/alumnos?${authQuery}`),
        fetch(`${API_BASE}/profesores?${authQuery}`),
        fetch(`${API_BASE}/certificados/panel?${authQuery}`),
        fetch(`${API_BASE}/director/logs-eliminacion?${authQuery}`)
      ]);

      if (!resPanel.ok) {
        const err = await resPanel.json();
        throw new Error(err.detail || 'Error al obtener estadísticas del colegio.');
      }

      const panelData = await resPanel.json();
      const alumnosData = resAlumnos.ok ? await resAlumnos.json() : [];
      const profesoresData = resProfesores.ok ? await resProfesores.json() : [];
      const certificadosData = resCertificados.ok ? await resCertificados.json() : [];
      const logsData = resLogs.ok ? await resLogs.json() : [];

      setDatosPanel(panelData);
      setListaAlumnos(alumnosData);
      setListaProfesores(profesoresData);
      setListaCertificados(certificadosData);
      setListaLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (usuario && usuario.id) {
      cargarDatosDirector();
    }
  }, [usuario]);

  // Función de eliminación con confirmación y registro en deleted_logs
  async function handleEliminar(tipo, id, nombre) {
    const confirmacion = window.confirm(
      `¿Confirmas la eliminación de ${tipo} "${nombre}" (ID #${id})?\n\nEsta acción eliminará el registro y sus dependencias del centro, y quedará registrada en la tabla de auditoría (deleted_logs) con fecha y usuario.`
    );
    if (!confirmacion) return;

    try {
      const authQuery = `director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      let endpoint = '';
      if (tipo === 'alumno') endpoint = `${API_BASE}/alumnos/${id}?${authQuery}`;
      else if (tipo === 'profesor') endpoint = `${API_BASE}/profesores/${id}?${authQuery}`;
      else if (tipo === 'curso') endpoint = `${API_BASE}/cursos/${id}?${authQuery}`;
      else if (tipo === 'certificado') endpoint = `${API_BASE}/certificados/${id}?${authQuery}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al eliminar el registro.');

      setMensajeExito(data.mensaje || `${tipo} eliminado correctamente y registrado en deleted_logs.`);
      setTimeout(() => setMensajeExito(''), 4500);

      // Si teníamos ese modal abierto, cerrarlo
      if (tipo === 'curso' && cursoSeleccionadoId === id) {
        setCursoSeleccionadoId(null);
        setDatosDetalleCurso(null);
      }
      if (tipo === 'profesor' && profesorSeleccionadoId === id) setProfesorSeleccionadoId(null);
      if (tipo === 'alumno' && alumnoSeleccionadoId === id) setAlumnoSeleccionadoId(null);

      cargarDatosDirector();
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

  // Cargar detalle de un curso específico cuando se selecciona
  async function cargarDetalleCurso(cursoId) {
    setCursoSeleccionadoId(cursoId);
    setCargandoDetalleCurso(true);
    try {
      const authQuery = `director_nombre=${encodeURIComponent(usuario.nombre)}&director_contrasena=${encodeURIComponent(usuario.contrasena)}`;
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/detalle?${authQuery}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al cargar detalle del curso.');
      }
      const data = await res.json();
      setDatosDetalleCurso(data);
    } catch (err) {
      alert(`Error: ${err.message}`);
      setCursoSeleccionadoId(null);
    } finally {
      setCargandoDetalleCurso(false);
    }
  }

  // Filtrado de cursos
  const cursosFiltrados = (datosPanel?.cursos || []).filter((c) => {
    const texto = `${c.nombre} ${c.materia}`.toLowerCase();
    return texto.includes(busquedaCursos.toLowerCase());
  });

  // Filtrado de alumnos
  const alumnosFiltrados = listaAlumnos.filter((a) => {
    return (a.nombre_apellidos || '').toLowerCase().includes(busquedaAlumnos.toLowerCase());
  });

  // Filtrado de profesores
  const profesoresFiltrados = listaProfesores.filter((p) => {
    return (p.nombre_apellidos || '').toLowerCase().includes(busquedaProfesores.toLowerCase());
  });

  // Filtrado de certificados
  const certificadosFiltrados = listaCertificados.filter((c) => {
    return (c.nombre || '').toLowerCase().includes(busquedaCertificados.toLowerCase());
  });

  const primerNombre = usuario.nombre ? usuario.nombre.split(' ')[0] : 'Director';

  return (
    <div className="panel-privado">
      {/* DESPLEGABLE IZQUIERDO: CHAT CON IA (GOOGLE GEMINI) */}
      <ChatbotDrawer
        abierto={chatIaAbierto}
        onCerrar={() => setChatIaAbierto(false)}
        usuario={{ ...usuario, rol: 'director' }}
        tituloPersonalizado="🏛️ Copiloto IA Dirección"
      />

      {/* BARRA LATERAL (IDÉNTICA EN ESTRUCTURA A LA DE ALUMNO Y PROFESOR) */}
      <aside className="barra-lateral">
        <div className="perfil-lateral">
          <div className="avatar-alumno-wrapper">
            <div
              className="avatar-profesor-director"
              style={{ width: '96px', height: '96px', fontSize: '2.2rem', margin: '0 auto', boxShadow: '0 0 0 3px var(--gold-400), var(--shadow-md)' }}
            >
              {usuario.nombre ? usuario.nombre.charAt(0) : 'D'}
            </div>
            <div className="insignia-verificado" title="Dirección Oficial Autenticada">✓</div>
          </div>
          <h3>{usuario.nombre}</h3>
          <div className="matricula-id">Director General · ID #{usuario.id}</div>
          <span className="etiqueta-rol">Dirección y Gestión</span>
        </div>

        {/* BOTÓN DESPLEGABLE CHAT IA */}
        <button
          type="button"
          className="btn-chat-ia-toggle"
          onClick={() => setChatIaAbierto(true)}
          title="Hablar con el Asistente IA"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🏛️</span>
            <span>Chat Asistente IA</span>
          </div>
          <span className="badge-ia-activa">Gemini</span>
        </button>

        {/* MENÚ LATERAL CON LOS APARTADOS PEDIDOS */}
        <nav className="menu-navegacion">
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'estadisticas' ? 'activo' : ''}`}
            onClick={() => {
              setSeccionActiva('estadisticas');
              setCursoSeleccionadoId(null);
            }}
          >
            <span className="btn-nav-icono">📊</span> Estadísticas del Colegio
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'cursos' ? 'activo' : ''}`}
            onClick={() => setSeccionActiva('cursos')}
          >
            <span className="btn-nav-icono">📚</span> Cursos Académicos
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'alumnos' ? 'activo' : ''}`}
            onClick={() => {
              setSeccionActiva('alumnos');
              setCursoSeleccionadoId(null);
            }}
          >
            <span className="btn-nav-icono">🎓</span> Alumnos
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'profesores' ? 'activo' : ''}`}
            onClick={() => {
              setSeccionActiva('profesores');
              setCursoSeleccionadoId(null);
            }}
          >
            <span className="btn-nav-icono">👨‍🏫</span> Profesores
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'certificados' ? 'activo' : ''}`}
            onClick={() => {
              setSeccionActiva('certificados');
              setCursoSeleccionadoId(null);
            }}
          >
            <span className="btn-nav-icono">🏆</span> Certificados
          </button>
          <button
            type="button"
            className={`btn-nav ${seccionActiva === 'logs' ? 'activo' : ''}`}
            onClick={() => {
              setSeccionActiva('logs');
              setCursoSeleccionadoId(null);
            }}
          >
            <span className="btn-nav-icono">📜</span> Registro de Bajas (Logs)
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

      {/* CONTENIDO PRINCIPAL DEL DIRECTOR */}
      <section className="contenido-alumno">
        {/* Banner de saludo directivo y botón de relaciones */}
        <div className="banner-bienvenida-alumno">
          <div className="banner-alumno-textos">
            <h2>Gobernanza Institucional · {primerNombre}</h2>
            <p>Control estratégico global, supervisión de claustro, rendimiento estudiantil, asignaciones y títulos.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
            <div className="banner-alumno-periodo">
              Colegio Mayor Cibeles · 2026/2027
            </div>
            <button
              type="button"
              className="boton-dorado"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => setModalRelacionAbierto(true)}
            >
              <span>🔗</span> Asignar Alumnos / Profesores / Títulos
            </button>
          </div>
        </div>

        {cargando && (
          <div className="tarjeta-blanca" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--navy-700)', fontWeight: '600' }}>
              ⏳ Sincronizando datos institucionales del centro...
            </p>
          </div>
        )}

        {error && (
          <div className="alerta-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {mensajeExito && (
          <div className="alerta-exito-flotante">
            <span>✅</span> {mensajeExito}
          </div>
        )}

        {!cargando && datosPanel && (
          <>
            {/* ========================================================
               APARTADO 1 (INICIO): ESTADÍSTICAS DEL COLEGIO
               ======================================================== */}
            {seccionActiva === 'estadisticas' && (
              <div>
                <div className="metricas-fila">
                  <div className="tarjeta-metrica destacada">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Nota Media Colegio</span>
                      <div className="metrica-icono">🏆</div>
                    </div>
                    <div className="metrica-valor">
                      {datosPanel.estadisticas.nota_media_colegio}{' '}
                      <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>/ 10</span>
                    </div>
                    <div className="metrica-subtexto">
                      Baremo Oficial: <strong>{obtenerClaseEstado(datosPanel.estadisticas.nota_media_colegio).texto}</strong>
                    </div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill gold"
                        style={{ width: `${(datosPanel.estadisticas.nota_media_colegio / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Asistencia Global</span>
                      <div className="metrica-icono">📅</div>
                    </div>
                    <div className="metrica-valor">{datosPanel.estadisticas.asistencia_media_colegio}%</div>
                    <div className="metrica-subtexto">Regularidad del centro (&gt;90%)</div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill emerald"
                        style={{ width: `${Math.min(datosPanel.estadisticas.asistencia_media_colegio, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Tasa de Aprobados</span>
                      <div className="metrica-icono">📈</div>
                    </div>
                    <div className="metrica-valor">{datosPanel.estadisticas.tasa_aprobados}%</div>
                    <div className="metrica-subtexto">Superación curricular general</div>
                    <div className="barra-progreso-mini">
                      <div
                        className="barra-progreso-fill"
                        style={{ width: `${Math.min(datosPanel.estadisticas.tasa_aprobados, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="tarjeta-metrica">
                    <div className="metrica-header">
                      <span className="metrica-titulo">Censo Educativo</span>
                      <div className="metrica-icono">🏛️</div>
                    </div>
                    <div className="metrica-valor" style={{ fontSize: '1.4rem' }}>
                      {datosPanel.estadisticas.total_alumnos} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alum.</span> · {datosPanel.estadisticas.total_profesores} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prof.</span>
                    </div>
                    <div className="metrica-subtexto">
                      {datosPanel.estadisticas.total_cursos} cursos · {listaCertificados.length} certificados
                    </div>
                  </div>
                </div>

                {/* Distribución del rendimiento escolar */}
                <div className="tarjeta-blanca" style={{ marginBottom: '1.5rem' }}>
                  <div className="encabezado-bloque">
                    <h3>📊 Distribución del Rendimiento del Alumnado</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Total evaluado: <strong>{datosPanel.estadisticas.total_alumnos} expedientes</strong>
                    </span>
                  </div>

                  <div className="rejilla-distribucion">
                    <div className="tarjeta-distribucion-item sobresaliente">
                      <div className="tarjeta-distribucion-valor" style={{ color: 'var(--emerald-600)' }}>
                        {datosPanel.estadisticas.distribucion.sobresalientes}
                      </div>
                      <div className="tarjeta-distribucion-label">Sobresalientes (9 - 10)</div>
                    </div>

                    <div className="tarjeta-distribucion-item notable">
                      <div className="tarjeta-distribucion-valor" style={{ color: 'var(--navy-600)' }}>
                        {datosPanel.estadisticas.distribucion.notables}
                      </div>
                      <div className="tarjeta-distribucion-label">Notables (7 - 8.9)</div>
                    </div>

                    <div className="tarjeta-distribucion-item aprobado">
                      <div className="tarjeta-distribucion-valor" style={{ color: 'var(--gold-600)' }}>
                        {datosPanel.estadisticas.distribucion.aprobados}
                      </div>
                      <div className="tarjeta-distribucion-label">Aprobados (5 - 6.9)</div>
                    </div>

                    <div className="tarjeta-distribucion-item refuerzo">
                      <div className="tarjeta-distribucion-valor" style={{ color: 'var(--rose-600)' }}>
                        {datosPanel.estadisticas.distribucion.refuerzo}
                      </div>
                      <div className="tarjeta-distribucion-label">En Refuerzo (&lt; 5)</div>
                    </div>
                  </div>
                </div>

                {/* Resumen por Cursos */}
                <div className="tarjeta-blanca">
                  <div className="encabezado-bloque">
                    <h3>📚 Panorama General de Cursos del Centro</h3>
                  </div>

                  <div className="lista-notas">
                    {datosPanel.cursos.map((c, i) => (
                      <div key={i} className="item-nota">
                        <div className="item-nota-info">
                          <h4>{c.nombre}</h4>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Departamento de {c.materia} · {c.total_profesores} profesor{c.total_profesores !== 1 ? 'es' : ''} · {c.total_alumnos} alumno{c.total_alumnos !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Media curso</span>
                            <strong style={{ color: 'var(--navy-900)' }}>{c.nota_media} / 10</strong>
                          </div>
                          <button
                            type="button"
                            className="boton-secundario"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSeccionActiva('cursos');
                              cargarDetalleCurso(c.id);
                            }}
                          >
                            Ver Información
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 2: CURSOS ACADÉMICOS (CON BUSCADOR, DETALLE Y ELIMINAR)
               ======================================================== */}
            {seccionActiva === 'cursos' && (
              <div>
                {/* SI HAY UN CURSO SELECCIONADO: MOSTRAR SU DETALLE COMPLETO */}
                {cursoSeleccionadoId && datosDetalleCurso ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <button
                        type="button"
                        className="btn-volver-seccion"
                        onClick={() => {
                          setCursoSeleccionadoId(null);
                          setDatosDetalleCurso(null);
                        }}
                      >
                        <span>&larr;</span> Volver al listado de cursos
                      </button>

                      <button
                        type="button"
                        className="btn-eliminar-registro"
                        onClick={() => handleEliminar('curso', datosDetalleCurso.id, datosDetalleCurso.nombre)}
                      >
                        <span>🗑️</span> Eliminar este Curso
                      </button>
                    </div>

                    <div className="tarjeta-blanca" style={{ marginBottom: '1.5rem' }}>
                      <div className="encabezado-bloque">
                        <div>
                          <span className="tarjeta-curso-tag">{datosDetalleCurso.materia}</span>
                          <h2 style={{ fontSize: '1.5rem', color: 'var(--navy-900)', marginTop: '0.4rem' }}>
                            {datosDetalleCurso.nombre}
                          </h2>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Código de Asignatura: #{datosDetalleCurso.id} · Departamento de {datosDetalleCurso.materia}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Calificación Media del Grupo</span>
                          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--gold-600)' }}>
                            {datosDetalleCurso.nota_media} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
                          </div>
                          <span className={`nota-badge ${obtenerClaseEstado(datosDetalleCurso.nota_media).clase}`}>
                            {obtenerClaseEstado(datosDetalleCurso.nota_media).texto}
                          </span>
                        </div>
                      </div>

                      {/* Profesores asignados al curso */}
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                          <h4 style={{ color: 'var(--navy-900)' }}>
                            👨‍🏫 Profesores que imparten este curso ({datosDetalleCurso.profesores.length})
                          </h4>
                          <button
                            type="button"
                            className="boton-secundario"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => setModalRelacionAbierto(true)}
                          >
                            + Asignar Profesor
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
                          {datosDetalleCurso.profesores.length > 0 ? (
                            datosDetalleCurso.profesores.map((p, i) => (
                              <div
                                key={i}
                                className="tarjeta-distribucion-item"
                                style={{ textAlign: 'left', cursor: 'pointer', padding: '0.8rem 1rem' }}
                                onClick={() => setProfesorSeleccionadoId(p.id)}
                              >
                                <strong style={{ color: 'var(--navy-900)', display: 'block' }}>{p.nombre_apellidos}</strong>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  📞 {p.telefono || 'Sin teléfono registrado'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin profesores asignados actualmente.</p>
                          )}
                        </div>
                      </div>

                      {/* Alumnos inscritos en el curso */}
                      <div style={{ marginTop: '1.8rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                          <h4 style={{ color: 'var(--navy-900)' }}>
                            🎓 Alumnos Matriculados ({datosDetalleCurso.alumnos.length})
                          </h4>
                          <button
                            type="button"
                            className="boton-secundario"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => setModalRelacionAbierto(true)}
                          >
                            + Matricular Alumno
                          </button>
                        </div>

                        <div className="tabla-calificaciones-wrap">
                          <table className="tabla-calificaciones">
                            <thead>
                              <tr>
                                <th>Alumno</th>
                                <th>Asistencia</th>
                                <th>Nota en el Curso</th>
                                <th>Media Global</th>
                                <th>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {datosDetalleCurso.alumnos.length > 0 ? (
                                datosDetalleCurso.alumnos.map((a, i) => (
                                  <tr key={i}>
                                    <td>
                                      <strong style={{ color: 'var(--navy-900)' }}>{a.nombre_apellidos}</strong>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{a.id}</div>
                                    </td>
                                    <td>{a.asistencia}%</td>
                                    <td>
                                      <span className={`nota-badge ${obtenerClaseEstado(a.nota).clase}`}>
                                        {a.nota !== null && a.nota !== undefined ? `${a.nota} pts` : 'Pendiente'}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{a.nota_media_global} pts</strong>
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="boton-secundario"
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                        onClick={() => setAlumnoSeleccionadoId(a.id)}
                                      >
                                        Ver Expediente
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                    No hay alumnos matriculados en este curso.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VISTA LISTADO DE TODOS LOS CURSOS CON BUSCADOR */
                  <div>
                    <div className="barra-acciones-seccion">
                      <div>
                        <h3>Catálogo de Cursos Impartidos</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Haz clic sobre cualquier curso para consultar profesores, alumnos matriculados y estadísticas.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="boton-primario"
                        onClick={() => setModalRelacionAbierto(true)}
                      >
                        <span>🔗</span> Asignar Curso
                      </button>
                    </div>

                    {/* BARRA DE BÚSQUEDA */}
                    <div className="barra-filtros-docente">
                      <div className="input-busqueda-docente" style={{ maxWidth: '500px' }}>
                        <span>🔍</span>
                        <input
                          type="text"
                          placeholder="Buscar curso por nombre o materia..."
                          value={busquedaCursos}
                          onChange={(e) => setBusquedaCursos(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* REJILLA DE CURSOS */}
                    <div className="rejilla-cursos">
                      {cursosFiltrados.length > 0 ? (
                        cursosFiltrados.map((c, i) => (
                          <div
                            key={i}
                            className="tarjeta-curso"
                            style={{ cursor: 'pointer' }}
                            onClick={() => cargarDetalleCurso(c.id)}
                            title="Haz clic para ver profesores, alumnos y calificaciones del curso"
                          >
                            <div className="tarjeta-curso-top">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="tarjeta-curso-tag">{c.materia}</span>
                                <button
                                  type="button"
                                  className="btn-eliminar-registro"
                                  title="Eliminar curso"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEliminar('curso', c.id, c.nombre);
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                              <h4>{c.nombre}</h4>
                              <div className="tarjeta-curso-fechas">
                                <div>👥 <strong>Alumnos:</strong> {c.total_alumnos} matriculados</div>
                                <div>👨‍🏫 <strong>Claustro:</strong> {c.total_profesores} profesor{c.total_profesores !== 1 ? 'es' : ''} asignado{c.total_profesores !== 1 ? 's' : ''}</div>
                              </div>
                            </div>

                            <div className="tarjeta-curso-bottom">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Media del curso:</span>
                                <strong style={{ color: 'var(--navy-900)' }}>{c.nota_media} / 10</strong>
                              </div>
                              <button
                                type="button"
                                className="boton-dorado"
                                style={{ width: '100%', marginTop: '0.6rem', padding: '0.45rem', fontSize: '0.82rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cargarDetalleCurso(c.id);
                                }}
                              >
                                Ver Información Detallada &rarr;
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="tarjeta-blanca" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                          <p style={{ color: 'var(--text-muted)' }}>
                            No se encontraron cursos coincidentes con "{busquedaCursos}".
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
               APARTADO 3: ALUMNOS (INFORMACIÓN, AÑADIR Y ELIMINAR)
               ======================================================== */}
            {seccionActiva === 'alumnos' && (
              <div>
                <div className="barra-acciones-seccion">
                  <div>
                    <h3>Directorio General de Alumnos</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Total registrado: <strong>{alumnosFiltrados.length} alumnos</strong>. Haz clic sobre uno para abrir su expediente.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      className="boton-dorado"
                      onClick={() => setModalRelacionAbierto(true)}
                    >
                      <span>🔗</span> Asignar a Curso/Título
                    </button>
                    <button
                      type="button"
                      className="boton-primario"
                      onClick={() => setModalCrearAlumnoAbierto(true)}
                    >
                      <span>➕</span> Añadir Alumno
                    </button>
                  </div>
                </div>

                {/* BUSCADOR */}
                <div className="barra-filtros-docente">
                  <div className="input-busqueda-docente" style={{ maxWidth: '450px' }}>
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar alumno por nombre y apellidos..."
                      value={busquedaAlumnos}
                      onChange={(e) => setBusquedaAlumnos(e.target.value)}
                    />
                  </div>
                </div>

                {/* REJILLA DE ALUMNOS */}
                <div className="rejilla-alumnos-docente">
                  {alumnosFiltrados.length > 0 ? (
                    alumnosFiltrados.map((a, i) => (
                      <div
                        key={i}
                        className="tarjeta-alumno-docente"
                        onClick={() => setAlumnoSeleccionadoId(a.id)}
                        title="Haz clic para consultar el expediente oficial"
                      >
                        <div>
                          <div className="alumno-docente-header">
                            <div className="avatar-alumno-docente">
                              {a.nombre_apellidos ? a.nombre_apellidos.charAt(0) : 'A'}
                            </div>
                            <div className="alumno-docente-info" style={{ flex: 1 }}>
                              <h4>{a.nombre_apellidos}</h4>
                              <span>Expediente ID: #{a.id}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-eliminar-registro"
                              title="Eliminar alumno"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminar('alumno', a.id, a.nombre_apellidos);
                              }}
                            >
                              🗑️
                            </button>
                          </div>

                          <div className="alumno-docente-stats">
                            <div className="stat-item">
                              <div className="stat-item-label">Nota Media</div>
                              <div className="stat-item-valor">{a.nota_media}</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">Asistencia</div>
                              <div className="stat-item-valor">{a.asistencia}%</div>
                            </div>
                            <div className="stat-item">
                              <div className="stat-item-label">Proyectos</div>
                              <div className="stat-item-valor">{a.trabajos_entregados}</div>
                            </div>
                          </div>
                        </div>

                        <div className="alumno-docente-footer">
                          <span className={`nota-badge ${obtenerClaseEstado(a.nota_media).clase}`}>
                            {obtenerClaseEstado(a.nota_media).texto}
                          </span>
                          <button
                            type="button"
                            className="btn-ver-expediente"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAlumnoSeleccionadoId(a.id);
                            }}
                          >
                            <span>📋 Abrir Ficha</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="tarjeta-blanca" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                      <p style={{ color: 'var(--text-muted)' }}>
                        No se encontraron alumnos con el criterio de búsqueda "{busquedaAlumnos}".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 4: PROFESORES (INFORMACIÓN, AÑADIR Y ELIMINAR)
               ======================================================== */}
            {seccionActiva === 'profesores' && (
              <div>
                <div className="barra-acciones-seccion">
                  <div>
                    <h3>Claustro Oficial de Profesores</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Total registrado: <strong>{profesoresFiltrados.length} profesores</strong>. Haz clic sobre uno para ver sus cursos y teléfono.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      className="boton-dorado"
                      onClick={() => setModalRelacionAbierto(true)}
                    >
                      <span>🔗</span> Asignar a Curso
                    </button>
                    <button
                      type="button"
                      className="boton-primario"
                      onClick={() => setModalCrearProfesorAbierto(true)}
                    >
                      <span>➕</span> Añadir Profesor
                    </button>
                  </div>
                </div>

                {/* BUSCADOR */}
                <div className="barra-filtros-docente">
                  <div className="input-busqueda-docente" style={{ maxWidth: '450px' }}>
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar profesor por nombre y apellidos..."
                      value={busquedaProfesores}
                      onChange={(e) => setBusquedaProfesores(e.target.value)}
                    />
                  </div>
                </div>

                {/* REJILLA DE PROFESORES */}
                <div className="rejilla-alumnos-docente">
                  {profesoresFiltrados.length > 0 ? (
                    profesoresFiltrados.map((p, i) => (
                      <div
                        key={i}
                        className="tarjeta-profesor-director"
                        onClick={() => setProfesorSeleccionadoId(p.id)}
                        title="Haz clic para ver la ficha del profesor"
                      >
                        <div>
                          <div className="profesor-director-header">
                            <div className="avatar-profesor-director">
                              {p.nombre_apellidos ? p.nombre_apellidos.charAt(0) : 'P'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '1.05rem', color: 'var(--navy-900)' }}>{p.nombre_apellidos}</h4>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Docente ID: #{p.id}</span>
                            </div>
                            <button
                              type="button"
                              className="btn-eliminar-registro"
                              title="Eliminar profesor"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminar('profesor', p.id, p.nombre_apellidos);
                              }}
                            >
                              🗑️
                            </button>
                          </div>

                          <div style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>
                              Contacto Telefónico
                            </div>
                            <strong style={{ color: 'var(--navy-900)' }}>
                              {p.telefono || 'Sin registrar'}
                            </strong>
                          </div>
                        </div>

                        <div className="alumno-docente-footer">
                          <span className="etiqueta-rol" style={{ fontSize: '0.68rem', margin: 0 }}>
                            Claustro Titular
                          </span>
                          <button
                            type="button"
                            className="btn-ver-expediente"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfesorSeleccionadoId(p.id);
                            }}
                          >
                            <span>📚 Ver Asignaciones</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="tarjeta-blanca" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                      <p style={{ color: 'var(--text-muted)' }}>
                        No se encontraron profesores con el criterio de búsqueda "{busquedaProfesores}".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 5: CERTIFICADOS (VERLOS, VER ALUMNOS Y GESTIÓN)
               ======================================================== */}
            {seccionActiva === 'certificados' && (
              <div>
                <div className="barra-acciones-seccion">
                  <div>
                    <h3>Títulos y Certificados Oficiales</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Total registrado: <strong>{certificadosFiltrados.length} certificados</strong>. Consulta qué alumnos los han obtenido o emite nuevos títulos.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="button"
                      className="boton-dorado"
                      onClick={() => setModalRelacionAbierto(true)}
                    >
                      <span>🏆</span> Otorgar a Alumno
                    </button>
                    <button
                      type="button"
                      className="boton-primario"
                      onClick={() => setModalCrearCertificadoAbierto(true)}
                    >
                      <span>➕</span> Crear Certificado
                    </button>
                  </div>
                </div>

                {/* BUSCADOR */}
                <div className="barra-filtros-docente">
                  <div className="input-busqueda-docente" style={{ maxWidth: '450px' }}>
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar certificado por nombre..."
                      value={busquedaCertificados}
                      onChange={(e) => setBusquedaCertificados(e.target.value)}
                    />
                  </div>
                </div>

                {/* REJILLA DE CERTIFICADOS */}
                <div className="rejilla-certificados">
                  {certificadosFiltrados.length > 0 ? (
                    certificadosFiltrados.map((cert, i) => (
                      <div key={i} className="tarjeta-certificado-admin">
                        <div>
                          <div className="certificado-admin-header">
                            <div className="certificado-admin-titulo">
                              <div className="icono-medalla-admin">🏅</div>
                              <div>
                                <h4 style={{ fontSize: '1.05rem', color: 'var(--navy-900)' }}>{cert.nombre}</h4>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Código Oficial: #{cert.id}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-eliminar-registro"
                              title="Eliminar certificado"
                              onClick={() => handleEliminar('certificado', cert.id, cert.nombre)}
                            >
                              🗑️
                            </button>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--navy-900)' }}>
                              Alumnos Acreditados ({cert.total_alumnos})
                            </span>
                          </div>

                          <div className="lista-alumnos-chip">
                            {cert.alumnos && cert.alumnos.length > 0 ? (
                              cert.alumnos.map((alm, j) => (
                                <div key={j} className="item-alumno-chip">
                                  <span
                                    style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--navy-800)' }}
                                    onClick={() => setAlumnoSeleccionadoId(alm.id)}
                                    title="Abrir expediente"
                                  >
                                    👤 {alm.nombre_apellidos}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    📅 {alm.fecha_obtencion || 'Registrado'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '0.5rem' }}>
                                Aún ningún alumno tiene asignado este certificado.
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="boton-secundario"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}
                            onClick={() => setModalRelacionAbierto(true)}
                          >
                            + Otorgar este título a un alumno
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="tarjeta-blanca" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem' }}>
                      <p style={{ color: 'var(--text-muted)' }}>
                        No se encontraron certificados con el criterio "{busquedaCertificados}".
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
               APARTADO 6: REGISTRO DE AUDITORÍA (DELETED_LOGS)
               ======================================================== */}
            {seccionActiva === 'logs' && (
              <div>
                <div className="barra-acciones-seccion">
                  <div>
                    <h3>Registro Oficial de Auditoría y Bajas (deleted_logs)</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Historial inmutable de registros eliminados según las directrices de <code>DATABASE_STRUTURE.md</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={cargarDatosDirector}
                  >
                    🔄 Actualizar Logs
                  </button>
                </div>

                <div className="tabla-calificaciones-wrap">
                  <table className="tabla-calificaciones">
                    <thead>
                      <tr>
                        <th>Fecha de Eliminación</th>
                        <th>Responsable</th>
                        <th>Tabla Afectada</th>
                        <th>Registro ID</th>
                        <th>Datos Eliminados (JSON)</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaLogs && listaLogs.length > 0 ? (
                        listaLogs.map((log, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                              {log.fecha_eliminacion}
                            </td>
                            <td>
                              <strong>{log.usuario_tipo}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>ID #{log.usuario_id}</span>
                            </td>
                            <td>
                              <span className={`badge-tabla-log ${log.tabla_afectada}`}>
                                {log.tabla_afectada}
                              </span>
                            </td>
                            <td>
                              <strong>#{log.registro_id}</strong>
                            </td>
                            <td style={{ maxWidth: '300px' }}>
                              <pre style={{
                                fontSize: '0.75rem',
                                background: 'var(--surface-muted)',
                                padding: '0.4rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                maxHeight: '100px',
                                overflowY: 'auto'
                              }}>
                                {typeof log.datos_eliminados === 'string'
                                  ? log.datos_eliminados
                                  : JSON.stringify(log.datos_eliminados, null, 2)}
                              </pre>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {log.motivo || 'Baja general'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No constan registros eliminados en el historial de auditoría.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL DETALLE DE PROFESOR */}
      {profesorSeleccionadoId && (
        <ModalDetalleProfesor
          profesorId={profesorSeleccionadoId}
          usuario={usuario}
          onCerrar={() => setProfesorSeleccionadoId(null)}
        />
      )}

      {/* MODAL EXPEDIENTE DE ALUMNO */}
      {alumnoSeleccionadoId && (
        <ModalExpedienteAlumnoDocente
          alumnoId={alumnoSeleccionadoId}
          cursoNombre="Consulta Directiva Global"
          usuario={usuario}
          onCerrar={() => setAlumnoSeleccionadoId(null)}
        />
      )}

      {/* MODAL CREAR ALUMNO */}
      <ModalCrearAlumno
        estaAbierto={modalCrearAlumnoAbierto}
        usuario={usuario}
        onCerrar={() => setModalCrearAlumnoAbierto(false)}
        onAlumnoCreado={(nuevoAlumno) => {
          setMensajeExito(`Alumno ${nuevoAlumno.nombre} dado de alta correctamente.`);
          setTimeout(() => setMensajeExito(''), 4000);
          cargarDatosDirector();
        }}
      />

      {/* MODAL CREAR PROFESOR */}
      <ModalCrearProfesor
        estaAbierto={modalCrearProfesorAbierto}
        usuario={usuario}
        onCerrar={() => setModalCrearProfesorAbierto(false)}
        onProfesorCreado={(nuevoProfe) => {
          setMensajeExito(`Profesor ${nuevoProfe.nombre} dado de alta correctamente.`);
          setTimeout(() => setMensajeExito(''), 4000);
          cargarDatosDirector();
        }}
      />

      {/* MODAL CREAR CERTIFICADO */}
      <ModalCrearCertificado
        estaAbierto={modalCrearCertificadoAbierto}
        usuario={usuario}
        onCerrar={() => setModalCrearCertificadoAbierto(false)}
        onCertificadoCreado={(nuevoCert) => {
          setMensajeExito(`Certificado ${nuevoCert.nombre} creado con éxito.`);
          setTimeout(() => setMensajeExito(''), 4000);
          cargarDatosDirector();
        }}
      />

      {/* MODAL ASIGNAR RELACIONES */}
      <ModalAsignarRelacion
        estaAbierto={modalRelacionAbierto}
        usuario={usuario}
        alumnos={listaAlumnos}
        profesores={listaProfesores}
        cursos={datosPanel?.cursos || []}
        certificados={listaCertificados}
        onCerrar={() => setModalRelacionAbierto(false)}
        onRelacionCreada={(mensaje) => {
          setMensajeExito(mensaje);
          setTimeout(() => setMensajeExito(''), 4000);
          cargarDatosDirector();
        }}
      />
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

      {usuario && usuario.rol === 'profesor' && (
        <VistaProfesor usuario={usuario} onCerrarSesion={handleCerrarSesion} />
      )}

      {usuario && usuario.rol === 'director' && (
        <VistaDirector usuario={usuario} onCerrarSesion={handleCerrarSesion} />
      )}

      {usuario && usuario.rol !== 'alumno' && usuario.rol !== 'profesor' && usuario.rol !== 'director' && (
        <VistaOtroRol usuario={usuario} onCerrarSesion={handleCerrarSesion} />
      )}

      <PiePagina />
    </div>
  );
}

export default App;
