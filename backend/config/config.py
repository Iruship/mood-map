from decouple import config

class Config:
    SECRET_KEY = config('SECRET_KEY', default='DEFAULT_SECRET')
    MONGODB_URI = config('MONGODB_URI', default='')
    JWT_SECRET_KEY = config('JWT_SECRET_KEY', default='JWT_SECRET')
    JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60  # 24 hours in seconds 