from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.posts import service
from src.posts.constants import PostStatus, PostType
from src.posts.dependencies import valid_post_id
from src.posts.models import Post
from src.posts.schemas import PostCreate, PostListItem, PostRead, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[PostListItem])
async def list_posts(
    post_type: PostType | None = Query(None),
    post_status: PostStatus | None = Query(None),
    slug: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db),
):
    return await service.get_all(session, post_type=post_type, status=post_status, slug=slug, limit=limit, offset=offset)


@router.get("/{post_id}", response_model=PostRead)
async def get_post(post: Post = Depends(valid_post_id)):
    return post


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(current_superuser)])
async def create_post(data: PostCreate, session: AsyncSession = Depends(get_db)):
    return await service.create(data, session)


@router.put("/{post_id}", response_model=PostRead, dependencies=[Depends(current_superuser)])
async def update_post(data: PostUpdate, post: Post = Depends(valid_post_id), session: AsyncSession = Depends(get_db)):
    return await service.update(post.id, data, session)


@router.patch("/{post_id}/publish", response_model=PostRead, dependencies=[Depends(current_superuser)])
async def publish_post(post: Post = Depends(valid_post_id), session: AsyncSession = Depends(get_db)):
    return await service.publish(post.id, session)


@router.patch("/{post_id}/unpublish", response_model=PostRead, dependencies=[Depends(current_superuser)])
async def unpublish_post(post: Post = Depends(valid_post_id), session: AsyncSession = Depends(get_db)):
    return await service.unpublish(post.id, session)


@router.patch("/{post_id}/archive", response_model=PostRead, dependencies=[Depends(current_superuser)])
async def archive_post(post: Post = Depends(valid_post_id), session: AsyncSession = Depends(get_db)):
    return await service.archive(post.id, session)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(current_superuser)])
async def delete_post(post: Post = Depends(valid_post_id), session: AsyncSession = Depends(get_db)):
    await service.delete(post.id, session)
