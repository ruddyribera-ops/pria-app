"""
BrandingService - Manages school branding configuration in PRIA v7
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.school_branding import SchoolBranding
from app.schemas.export import BrandingConfig


class BrandingService:
    """Service for managing school branding"""

    @staticmethod
    async def get_branding(db: AsyncSession) -> BrandingConfig:
        """
        Get current school branding configuration.
        Returns Las Palmas defaults if no branding record exists.

        Args:
            db: AsyncSession

        Returns:
            BrandingConfig with school branding details
        """
        result = await db.execute(select(SchoolBranding))
        branding = result.scalars().first()

        # If no branding exists, create default Las Palmas branding
        if not branding:
            branding = SchoolBranding(
                school_name="Las Palmas",
                header_color="#D52B1E",
                footer_color="#FDB927",
                accent_color="#007934",
                primary_font="Arial",
                footer_text="Las Palmas School\nLa Paz, Bolivia",
            )
            db.add(branding)
            await db.commit()
            await db.refresh(branding)

        return BrandingConfig.model_validate(branding)

    @staticmethod
    async def update_branding(db: AsyncSession, data: BrandingConfig) -> BrandingConfig:
        """
        Update school branding configuration.
        Only one branding record should exist (singleton pattern).

        Args:
            db: AsyncSession
            data: Updated branding configuration

        Returns:
            Updated BrandingConfig
        """
        result = await db.execute(select(SchoolBranding))
        branding = result.scalars().first()

        if not branding:
            # Create new branding if it doesn't exist
            branding = SchoolBranding(
                school_name=data.school_name,
                logo_url=data.logo_url,
                header_color=data.header_color,
                footer_color=data.footer_color,
                accent_color=data.accent_color,
                primary_font=data.primary_font,
                footer_text=data.footer_text,
            )
            db.add(branding)
        else:
            # Update existing branding
            branding.school_name = data.school_name
            branding.logo_url = data.logo_url
            branding.header_color = data.header_color
            branding.footer_color = data.footer_color
            branding.accent_color = data.accent_color
            branding.primary_font = data.primary_font
            branding.footer_text = data.footer_text

        await db.commit()
        await db.refresh(branding)
        return BrandingConfig.model_validate(branding)

    @staticmethod
    async def upload_logo(db: AsyncSession, file_path: str) -> str:
        """
        Save logo to exports directory and update branding URL.

        Args:
            db: AsyncSession
            file_path: Path to saved logo file

        Returns:
            URL or path to logo for use in exports
        """
        result = await db.execute(select(SchoolBranding))
        branding = result.scalars().first()

        if not branding:
            branding = SchoolBranding(school_name="Las Palmas")
            db.add(branding)

        branding.logo_url = file_path
        await db.commit()
        await db.refresh(branding)

        return file_path
