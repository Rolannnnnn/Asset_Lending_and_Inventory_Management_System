from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from pydantic import BaseModel

class Image(Base):
    __tablename__ = "images"
    uuid = Column(String, primary_key=True)
    url = Column(String)

class Item(Base):
    __tablename__ = "items"
    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    is_available = Column(bool)
    image_uuid = Column(String, ForeignKey("images.uuid"))
    
    image = relationship("Image")

class ImageSchema(BaseModel):
    uuid: str
    url: str

    class Config:
        from_attributes = True

class ItemSchema(BaseModel):
    id: str
    name: str
    image_uuid: str
    image: ImageSchema | None = None 

    class Config:
        from_attributes = True