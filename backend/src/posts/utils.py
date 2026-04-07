from typing import Any


def extract_excerpt(content: dict[str, Any] | None, word_limit: int = 10) -> str:
    """Return the first `word_limit` words of plain text from a TipTap JSON document.

    Walks the node tree in document order, collecting every ``text`` node value,
    then joins them with a single space and returns the first `word_limit` words.
    Returns ``""`` if *content* is null, empty, or structurally malformed.
    """
    if not content or not isinstance(content, dict):
        return ""

    words: list[str] = []

    def _walk(node: Any) -> None:
        if not isinstance(node, dict):
            return
        if node.get("type") == "text":
            node_text = node.get("text", "")
            if isinstance(node_text, str):
                words.extend(node_text.split())
        for child in node.get("content", []):
            _walk(child)

    _walk(content)
    return " ".join(words[:word_limit])


_RELATIONSHIP_ATTRS = ("tags", "media", "cover_media")


def inject_excerpt(data: Any) -> Any:
    """Inject a computed ``excerpt`` field into raw data before Pydantic validation.

    Handles two input shapes:
    - **dict** — injects ``excerpt`` key if missing.
    - **ORM instance** — converts to dict via ``__table__.columns``, carries over
      relationship attributes, and injects ``excerpt``. Pydantic's field filtering
      ensures only declared schema fields appear in the final output.
    """
    if isinstance(data, dict):
        if "excerpt" not in data:
            data["excerpt"] = extract_excerpt(data.get("content"))
        return data

    # ORM instance path
    obj_dict = {c.key: getattr(data, c.key) for c in data.__table__.columns}
    obj_dict["excerpt"] = extract_excerpt(obj_dict.get("content"))
    for rel in _RELATIONSHIP_ATTRS:
        obj_dict[rel] = getattr(data, rel, None)
    return obj_dict
