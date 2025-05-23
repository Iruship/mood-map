from pydantic import BaseModel, EmailStr, Field, ConfigDict, conlist, confloat
from typing import Optional, List, Dict
from datetime import datetime
import uuid
from uuid import UUID

class UserBase(BaseModel):
    name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: UUID = Field(default_factory=uuid.uuid4, alias="_id")
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra = {"example": {"_id": "123e4567-e89b-12d3-a456-426614174000"}}
    )

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

class PHQ9Answer(BaseModel):
    question_id: int = Field(..., ge=0, lt=9)
    score: int = Field(..., ge=0, le=3)

class PHQ9Submit(BaseModel):
    score: int = Field(..., ge=0, le=27)

class PHQ9Response(BaseModel):
    id: UUID = Field(default_factory=uuid.uuid4, alias="_id")
    username: str
    userId: str
    score: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True
    )

class PHQ9HistoryResponse(BaseModel):
    score: int
    created_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True
    )

class PHQ9Question(BaseModel):
    id: int
    text: str

class PHQ9Questions(BaseModel):
    questions: List[PHQ9Question]
    scoring_guide: Dict[str, str]

class EmotionCreate(BaseModel):
    emotion: str = Field(..., min_length=1)
    confidence: confloat(ge=0, le=1)

class EmotionResponse(BaseModel):
    id: UUID = Field(default_factory=uuid.uuid4, alias="_id")
    user_id: str
    emotion: str
    confidence: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True
    )

class FaceLocation(BaseModel):
    x: int
    y: int
    width: int
    height: int

class FaceEmotion(BaseModel):
    emotion: str
    confidence: float
    face_location: FaceLocation

class EmotionDetectionResponse(BaseModel):
    success: bool
    faces: List[FaceEmotion] = []
    error: Optional[str] = None 