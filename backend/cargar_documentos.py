from pathlib import Path

from backend.rag_service import indexar_documento


BASE_DIR = Path(__file__).resolve().parent
DOCUMENTOS_DIR = BASE_DIR / "documentos"

EXTENSIONES_PERMITIDAS = {
    ".txt",
    ".md",
}


def cargar_documentos() -> None:
    """
    Recorre la carpeta de documentos e indexa cada archivo.
    """

    if not DOCUMENTOS_DIR.exists():
        raise RuntimeError(
            f"No existe la carpeta {DOCUMENTOS_DIR}"
        )

    archivos = [
        archivo
        for archivo in DOCUMENTOS_DIR.rglob("*")
        if archivo.is_file()
        and archivo.suffix.lower() in EXTENSIONES_PERMITIDAS
    ]

    if not archivos:
        print(
            "No se encontraron documentos .txt o .md"
        )
        return

    total_fragmentos = 0

    for archivo in archivos:
        ruta_relativa = archivo.relative_to(
            DOCUMENTOS_DIR
        ).as_posix()

        print(f"Procesando: {ruta_relativa}")

        texto = archivo.read_text(
            encoding="utf-8"
        )

        cantidad = indexar_documento(
            titulo=archivo.stem.replace("_", " "),
            texto=texto,
            fuente=ruta_relativa,
)

        total_fragmentos += cantidad

        print(
            f"Fragmentos guardados: {cantidad}"
        )

    print(
        f"Carga completada. Total: {total_fragmentos}"
    )


if __name__ == "__main__":
    cargar_documentos()