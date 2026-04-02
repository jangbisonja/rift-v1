ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_MB = 10


class ErrorCode:
    MEDIA_NOT_FOUND = "Media not found"
    INVALID_FILE_TYPE = "Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
    FILE_TOO_LARGE = f"File too large. Max size: {MAX_FILE_SIZE_MB}MB"
