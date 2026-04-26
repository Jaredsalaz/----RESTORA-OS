#!/bin/bash
# ==============================================================================
# Script de Backup Automático de Base de Datos para RESTORA OS
# ==============================================================================
# Este script debe ejecutarse mediante cron cada 24 horas.
# Ejemplo de crontab para ejecutarse a las 3:00 AM todos los días:
# 0 3 * * * /opt/restora/infra/scripts/backup.sh
# ==============================================================================

BACKUP_DIR="/var/backups/restora"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE_NAME="restora_db_backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# Ejecuta pg_dump dentro del contenedor de Docker y guarda en la máquina host
docker exec -t restora_postgres pg_dump -U restora restora_db > "$BACKUP_DIR/$FILE_NAME"

# (Opcional) Subir el backup a un S3 / MinIO para cumplir con la norma de 
# backups off-site.
# mc cp "$BACKUP_DIR/$FILE_NAME" minio/backups/

# Mantener solo los últimos 7 días de backups para ahorrar espacio
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -exec rm {} \;

echo "Backup completado: $FILE_NAME"
