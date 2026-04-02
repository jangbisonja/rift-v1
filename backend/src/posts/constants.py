from enum import Enum


class PostType(str, Enum):
    NEWS = "NEWS"
    ARTICLE = "ARTICLE"
    PROMO = "PROMO"
    EVENT = "EVENT"


class PostStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVE = "ARCHIVE"


class ErrorCode:
    POST_NOT_FOUND = "Post not found"
    SLUG_ALREADY_EXISTS = "Post with this slug already exists"
