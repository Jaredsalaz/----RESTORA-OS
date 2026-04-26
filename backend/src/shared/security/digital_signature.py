import json
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa

# NOTA: En producción, las llaves nunca deben generarse en memoria así.
# Deben cargarse de variables de entorno, un archivo seguro (.pem) o un Key Vault.
def generate_keys():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()
    return private_key, public_key

# Generamos un par de llaves "dummy" al arrancar el servidor para propósitos de prueba MVP
DEV_PRIVATE_KEY, DEV_PUBLIC_KEY = generate_keys()

def sign_invoice(invoice_data: dict, private_key=DEV_PRIVATE_KEY) -> str:
    """
    Toma un diccionario con los datos del ticket/factura y genera
    una firma criptográfica codificada en Base64.
    """
    payload = json.dumps(invoice_data, sort_keys=True).encode('utf-8')
    signature = private_key.sign(payload, padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(signature).decode('utf-8')

def verify_invoice(invoice_data: dict, signature: str, public_key=DEV_PUBLIC_KEY) -> bool:
    """
    Verifica que la firma coincida exactamente con los datos del ticket.
    Si alguien altera el ticket (ej. cambia el total a cobrar), esto devolverá False.
    """
    payload = json.dumps(invoice_data, sort_keys=True).encode('utf-8')
    sig_bytes = base64.b64decode(signature)
    try:
        public_key.verify(sig_bytes, payload, padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception:
        return False
