from sqlalchemy.ext.asyncio import AsyncSession
from src.adapters.persistence.models.models import AuditLogModel

async def log_action(db: AsyncSession, user_id: str, action: str, entity: str, entity_id: str = None, details: dict = None):
    """
    Guarda un registro inmutable en la tabla audit_logs.
    Se utiliza en endpoints sensibles para cumplir con la auditoría de seguridad.
    """
    audit_log = AuditLogModel(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details or {}
    )
    db.add(audit_log)
    await db.commit()
