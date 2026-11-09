from typing import Any

try:
    from backend.database import get_connection
    from backend.gemini_service import responder
    from backend.local_embeddings import MODEL_NAME, generar_embedding
except ImportError:
    from database import get_connection
    from gemini_service import responder
    from local_embeddings import MODEL_NAME, generar_embedding


def vector_a_text(
    vector: list[float],
) -> str:
    """
    Convierte una lista de números al formato aceptado por pgvector.

    Ejemplo:
    [0.12, 0.45, 0.78] -> "[0.12,0.45,0.78]"
    """

    return "[" + ",".join(
        str(valor)
        for valor in vector
    ) + "]"


def dividir_texto(
    texto: str,
    tamano: int = 800,
    solapamiento: int = 150,
) -> list[str]:
    """
    Divide el documento en fragmentos parcialmente solapados.
    """

    texto = " ".join(texto.split())

    if not texto:
        return []

    if tamano <= 0:
        raise ValueError(
            "El tamaño debe ser mayor que cero"
        )

    if solapamiento < 0:
        raise ValueError(
            "El solapamiento no puede ser negativo"
        )

    if solapamiento >= tamano:
        raise ValueError(
            "El solapamiento debe ser menor que el tamaño"
        )

    fragmentos: list[str] = []
    inicio = 0

    while inicio < len(texto):
        final = min(
            inicio + tamano,
            len(texto),
        )

        if final < len(texto):
            ultimo_punto = texto.rfind(
                ". ",
                inicio,
                final,
            )

            ultimo_espacio = texto.rfind(
                " ",
                inicio,
                final,
            )

            limite_minimo = inicio + tamano // 2

            if ultimo_punto > limite_minimo:
                final = ultimo_punto + 1

            elif ultimo_espacio > limite_minimo:
                final = ultimo_espacio

        fragmento = texto[inicio:final].strip()

        if fragmento:
            fragmentos.append(fragmento)

        if final >= len(texto):
            break

        nuevo_inicio = final - solapamiento

        if nuevo_inicio <= inicio:
            nuevo_inicio = final

        inicio = nuevo_inicio

    return fragmentos


def construir_fuente_fragmento(
    fuente_original: str,
    numero_fragmento: int,
) -> str:
    """
    Crea una fuente única para cada fragmento.

    Ejemplo:
    certificados.md#fragmento-0
    certificados.md#fragmento-1
    """

    return (
        f"{fuente_original}"
        f"#fragmento-{numero_fragmento}"
    )


def obtener_fuente_original(
    fuente_fragmento: str,
) -> str:
    """
    Extrae el nombre original del archivo.

    Ejemplo:
    certificados.md#fragmento-2 -> certificados.md
    """

    return fuente_fragmento.split(
        "#fragmento-",
        maxsplit=1,
    )[0]


def guardar_fragmento(
    titulo: str,
    contenido: str,
    fuente: str,
    numero_fragmento: int,
) -> None:
    """
    Genera localmente el embedding y guarda el fragmento
    en public.chunks.
    """

    contenido = contenido.strip()

    if not contenido:
        raise ValueError(
            "No se puede guardar un fragmento vacío"
        )

    embedding = generar_embedding(
        contenido
    )

    embedding_sql = vector_a_text(
        embedding
    )

    fuente_fragmento = construir_fuente_fragmento(
        fuente_original=fuente,
        numero_fragmento=numero_fragmento,
    )

    conexion = get_connection()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO public.chunks (
                    titulo,
                    contenido,
                    fuente,
                    model,
                    embedding
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::vector
                )
                ON CONFLICT (fuente)
                DO UPDATE SET
                    titulo = EXCLUDED.titulo,
                    contenido = EXCLUDED.contenido,
                    model = EXCLUDED.model,
                    embedding = EXCLUDED.embedding
                """,
                (
                    titulo,
                    contenido,
                    fuente_fragmento,
                    MODEL_NAME,
                    embedding_sql,
                ),
            )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        conexion.close()


def eliminar_documento_indexado(
    fuente: str,
) -> None:
    """
    Elimina todos los fragmentos anteriores de un documento.

    Si fuente es certificados.md, elimina:
    certificados.md#fragmento-0
    certificados.md#fragmento-1
    certificados.md#fragmento-2
    """

    conexion = get_connection()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM public.chunks
                WHERE fuente = %s
                   OR fuente LIKE %s ESCAPE '\\'
                """,
                (
                    fuente,
                    f"{fuente}#fragmento-%",
                ),
            )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        conexion.close()


def indexar_documento(
    titulo: str,
    texto: str,
    fuente: str,
    metadata: dict[str, Any] | None = None,
) -> int:
    """
    Divide un documento y guarda todos sus fragmentos.

    metadata se conserva en la firma para que cargar_documentos.py
    siga funcionando, pero no se guarda porque chunks no tiene una
    columna metadata.
    """

    fragmentos = dividir_texto(
        texto
    )

    if not fragmentos:
        return 0

    eliminar_documento_indexado(
        fuente
    )

    for numero, fragmento in enumerate(
        fragmentos
    ):
        guardar_fragmento(
            titulo=titulo,
            contenido=fragmento,
            fuente=fuente,
            numero_fragmento=numero,
        )

    return len(fragmentos)


def buscar_contexto(
    pregunta: str,
    limite: int = 4,
    similitud_minima: float = 0.35,
) -> list[dict[str, Any]]:
    """
    Busca en public.chunks los fragmentos más similares
    a la pregunta.
    """

    pregunta = pregunta.strip()

    if not pregunta:
        return []

    if limite < 1 or limite > 10:
        raise ValueError(
            "El límite debe estar entre 1 y 10"
        )

    if similitud_minima < -1 or similitud_minima > 1:
        raise ValueError(
            "La similitud mínima debe estar entre -1 y 1"
        )

    embedding = generar_embedding(
        pregunta
    )

    embedding_sql = vector_a_text(
        embedding
    )

    conexion = get_connection()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    titulo,
                    contenido,
                    fuente,
                    model,
                    1 - (
                        embedding <=> %s::vector
                    ) AS similitud
                FROM public.chunks
                WHERE
                    model = %s
                    AND 1 - (
                        embedding <=> %s::vector
                    ) >= %s
                ORDER BY
                    embedding <=> %s::vector
                LIMIT %s
                """,
                (
                    embedding_sql,
                    MODEL_NAME,
                    embedding_sql,
                    similitud_minima,
                    embedding_sql,
                    limite,
                ),
            )

            resultados = cursor.fetchall()

        return [
            dict(resultado)
            for resultado in resultados
        ]

    finally:
        conexion.close()


def construir_contexto(
    resultados: list[dict[str, Any]],
) -> str:
    """
    Convierte los fragmentos recuperados en texto para Gemini.
    """

    bloques: list[str] = []

    for posicion, resultado in enumerate(
        resultados,
        start=1,
    ):
        fuente_original = obtener_fuente_original(
            resultado["fuente"]
        )

        bloque = (
            f"[FUENTE {posicion}]\n"
            f"Título: {resultado['titulo']}\n"
            f"Archivo: {fuente_original}\n"
            f"Referencia interna: {resultado['fuente']}\n"
            f"Contenido:\n{resultado['contenido']}"
        )

        bloques.append(
            bloque
        )

    return "\n\n".join(
        bloques
    )


def preparar_fuentes(
    resultados: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Prepara las fuentes que se devolverán al frontend.
    """

    fuentes: list[dict[str, Any]] = []

    for resultado in resultados:
        fuente_original = obtener_fuente_original(
            resultado["fuente"]
        )

        numero_fragmento = 0

        if "#fragmento-" in resultado["fuente"]:
            numero_fragmento_texto = resultado[
                "fuente"
            ].rsplit(
                "#fragmento-",
                maxsplit=1,
            )[1]

            try:
                numero_fragmento = int(
                    numero_fragmento_texto
                )
            except ValueError:
                numero_fragmento = 0

        fuentes.append(
            {
                "titulo": resultado["titulo"],
                "fuente": fuente_original,
                "fragmento": numero_fragmento,
                "similitud": round(
                    float(resultado["similitud"]),
                    4,
                ),
            }
        )

    return fuentes


def responder_con_rag(
    pregunta: str,
    datos: str = "",
) -> dict[str, Any]:
    """
    Ejecuta el proceso completo del RAG.

    La documentación es un complemento: si no hay fragmentos relevantes,
    se responde igualmente sin contexto. datos es el resumen académico
    permitido para el rol del usuario (lo prepara main.py).
    """

    pregunta = pregunta.strip()

    if not pregunta:
        raise ValueError(
            "La pregunta no puede estar vacía"
        )

    resultados = buscar_contexto(
        pregunta=pregunta,
        limite=4,
        similitud_minima=0.35,
    )

    contexto = ""

    if resultados:
        contexto = construir_contexto(
            resultados
        )

    respuesta = responder(
        pregunta=pregunta,
        contexto=contexto,
        datos=datos,
    )

    return {
        "respuesta": respuesta,
        "fuentes": preparar_fuentes(resultados),
    }