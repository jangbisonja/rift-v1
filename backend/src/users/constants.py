import enum


class NicknameScript(str, enum.Enum):
    CYRILLIC = "CYRILLIC"
    LATIN = "LATIN"


class UserBadge(str, enum.Enum):
    VERIFIED = "VERIFIED"
    FOUNDER = "FOUNDER"
