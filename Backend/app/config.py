from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")
    
    REDIS_URL: str = "redis://redis:6379/0"
    DATA_DIR: str = "/data"

settings = Settings()