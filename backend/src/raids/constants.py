import enum


class RaidDifficulty(str, enum.Enum):
    NORMAL = "NORMAL"
    HARD = "HARD"
    TFM = "TFM"
    NIGHTMARE = "NIGHTMARE"
