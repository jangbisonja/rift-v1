import asyncio
import io
from pathlib import Path
from typing import Protocol

from PIL import Image


class FileStorage(Protocol):
    """Abstract file storage interface."""

    async def save(self, rel_path: Path, raw_content: bytes) -> None:
        """Convert to WebP and persist content at the given relative path."""
        ...

    async def delete(self, rel_path: Path) -> None:
        """Remove the file at the given relative path. No-op if missing."""
        ...


def _convert_to_webp(content: bytes) -> bytes:
    """Convert image bytes to WebP format."""
    img = Image.open(io.BytesIO(content))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85, method=6)
    return output.getvalue()


def _sync_save(rel_path: Path, raw_content: bytes) -> None:
    """Sync helper: convert to WebP and write to disk. Runs in a thread."""
    webp_bytes = _convert_to_webp(raw_content)
    rel_path.parent.mkdir(parents=True, exist_ok=True)
    rel_path.write_bytes(webp_bytes)


def _sync_delete(rel_path: Path) -> None:
    """Sync helper: delete file if it exists. Runs in a thread."""
    if rel_path.exists():
        rel_path.unlink()


class LocalFileStorage:
    """Local filesystem implementation of FileStorage."""

    async def save(self, rel_path: Path, raw_content: bytes) -> None:
        await asyncio.to_thread(_sync_save, rel_path, raw_content)

    async def delete(self, rel_path: Path) -> None:
        await asyncio.to_thread(_sync_delete, rel_path)
