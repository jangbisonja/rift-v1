from src.exceptions import NotFound


class RaidNotFound(NotFound):
    def __init__(self):
        super().__init__(detail="Raid not found")


class RaidBossNotFound(NotFound):
    def __init__(self):
        super().__init__(detail="Raid boss not found")


class RaidCoverNotFound(NotFound):
    def __init__(self):
        super().__init__(detail="Cover media not found")


class RaidBossIconNotFound(NotFound):
    def __init__(self):
        super().__init__(detail="Boss icon media not found")
