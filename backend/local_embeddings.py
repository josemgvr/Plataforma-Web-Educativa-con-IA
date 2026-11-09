import os
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


MODEL_NAME = os.getenv(
    "LOCAL_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)


print(f"Cargando modelo local de embeddings: {MODEL_NAME}")

modelo_embeddings = SentenceTransformer(
    MODEL_NAME,
    device="cpu",
)

print("Modelo local de embeddings cargado correctamente")


def generar_embedding(texto: str) -> list[float]:

    """
    Convierte un texto en un vector local de 384 dimensiones.
    """

    texto = texto.strip()

    if not texto:
        raise ValueError(
            "No se puede generar un embedding de un texto vacío"
        )

    embedding = modelo_embeddings.encode(
        texto,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    vector = embedding.tolist()

    if len(vector) != 384:
        raise RuntimeError(
            f"El modelo devolvió {len(vector)} dimensiones "
            "en lugar de 384"
        )

    return vector


def generar_embeddings_lote(
    textos: list[str],
) -> list[list[float]]:
    """
    Genera embeddings de varios textos simultáneamente.
    Es más rápido para indexar documentos.
    """

    textos_limpios = [
        texto.strip()
        for texto in textos
        if texto.strip()
    ]

    if not textos_limpios:
        return []

    embeddings = modelo_embeddings.encode(
        textos_limpios,
        batch_size=16,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=True,
    )

    return embeddings.tolist()