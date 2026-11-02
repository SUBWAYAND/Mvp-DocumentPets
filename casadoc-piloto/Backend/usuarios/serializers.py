import base64
import binascii
import uuid
from datetime import date
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.html import strip_tags
from PIL import Image
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import DocumentoMedico, Mascota, Promocion

TIPOS_IMAGEN = ("data:image/jpeg", "data:image/png", "data:image/jpg", "data:image/webp")
TIPOS_DOCUMENTO = ("data:application/pdf",) + TIPOS_IMAGEN[:3]


# ---------------------------------------------------------------- utilidades
def limpiar_texto(data):
    """Elimina etiquetas HTML de los campos de texto (excepto archivos en base64)."""
    for clave, valor in data.items():
        if isinstance(valor, str) and not valor.startswith("data:"):
            data[clave] = strip_tags(valor)
    return data


def url_absoluta(serializer, ruta):
    """Convierte la ruta guardada en una URL completa que el navegador pueda abrir."""
    if not ruta:
        return None
    ruta = str(ruta)
    if ruta.startswith(("http", "data:")):
        return ruta
    url = default_storage.url(ruta)
    request = serializer.context.get("request")
    return request.build_absolute_uri(url) if request else url


def decodificar_base64(valor, tipos_permitidos, limite_mb):
    """Valida un archivo enviado como 'data:<tipo>;base64,<datos>' y devuelve (cabecera, bytes)."""
    if not isinstance(valor, str) or not valor.startswith("data:") or ";base64," not in valor:
        raise serializers.ValidationError("El archivo debe enviarse como una cadena Base64 válida.")
    cabecera, datos = valor.split(";base64,", 1)
    if cabecera not in tipos_permitidos:
        raise serializers.ValidationError("Tipo de archivo no permitido.")
    if len(datos) > limite_mb * 1024 * 1024 * 1.37:
        raise serializers.ValidationError(f"El archivo excede el máximo de {limite_mb} MB.")
    try:
        return cabecera, base64.b64decode(datos, validate=True)
    except (binascii.Error, ValueError):
        raise serializers.ValidationError("El archivo está corrupto o mal formado.")


def comprimir_imagen(contenido, max_lado=800, calidad=75):
    """Redimensiona y convierte a JPEG para ahorrar espacio."""
    try:
        img = Image.open(BytesIO(contenido))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((max_lado, max_lado))
        salida = BytesIO()
        img.save(salida, format="JPEG", quality=calidad, optimize=True)
        return salida.getvalue()
    except Exception:
        raise serializers.ValidationError("El archivo no es una imagen válida.")


def guardar_archivo(contenido, carpeta, extension):
    nombre = f"{carpeta}/{uuid.uuid4().hex}.{extension}"
    return default_storage.save(nombre, ContentFile(contenido))


def guardar_imagen(valor, carpeta, max_lado):
    """Valida, comprime y guarda una imagen en base64. Devuelve la ruta guardada."""
    if valor.startswith("http"):
        return valor
    _, contenido = decodificar_base64(valor, TIPOS_IMAGEN, limite_mb=10)
    return guardar_archivo(comprimir_imagen(contenido, max_lado), carpeta, "jpg")


# ---------------------------------------------------------------- autenticación
class LoginSerializer(TokenObtainPairSerializer):
    """Agrega al login los datos que el frontend guarda (rol y nombre)."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["rol"] = self.user.rol
        data["username"] = self.user.username
        data["email"] = self.user.email
        data["nombre_completo"] = self.user.get_full_name() or self.user.first_name or self.user.username
        return data


# ---------------------------------------------------------------- mascotas
class MascotaSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Mascota
        fields = ["id", "nombre", "especie", "raza", "fecha_nacimiento", "edad", "peso",
                  "fecha_ultima_visita", "documentos_count", "imagen", "imagen_url"]
        read_only_fields = ("documentos_count", "edad")
        extra_kwargs = {"imagen": {"write_only": True}}

    def get_imagen_url(self, obj):
        return url_absoluta(self, obj.imagen)

    def validate_imagen(self, value):
        return guardar_imagen(value, "mascotas", 800) if value else value

    def validate(self, attrs):
        attrs = limpiar_texto(attrs)
        nacimiento = attrs.get("fecha_nacimiento") or getattr(self.instance, "fecha_nacimiento", None)
        if not nacimiento:
            raise serializers.ValidationError({"fecha_nacimiento": "Debes indicar la fecha de nacimiento."})
        hoy = date.today()
        anios = hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))
        attrs["edad"] = max(anios, 0)
        return attrs


# ---------------------------------------------------------------- documentos médicos
class DocumentoListSerializer(serializers.ModelSerializer):
    """Versión liviana para listados: no incluye la ruta del archivo."""

    class Meta:
        model = DocumentoMedico
        exclude = ("archivo_url",)


class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoMedico
        fields = "__all__"

    def validate(self, attrs):
        return limpiar_texto(attrs)

    def validate_archivo_url(self, value):
        if not value:
            return value
        cabecera, contenido = decodificar_base64(value, TIPOS_DOCUMENTO, limite_mb=2)
        if cabecera == "data:application/pdf":
            if not contenido.startswith(b"%PDF-"):
                raise serializers.ValidationError("El contenido del archivo no es un PDF válido.")
            return guardar_archivo(contenido, "documentos", "pdf")
        return guardar_archivo(comprimir_imagen(contenido, 1200, 80), "documentos", "jpg")


# ---------------------------------------------------------------- promociones
class PromocionSerializer(serializers.ModelSerializer):
    imagen_url_firmada = serializers.SerializerMethodField()

    class Meta:
        model = Promocion
        fields = ["id", "titulo", "imagen_url", "imagen_url_firmada", "activa", "fecha_creacion"]
        extra_kwargs = {"imagen_url": {"write_only": True}}

    def get_imagen_url_firmada(self, obj):
        return url_absoluta(self, obj.imagen_url)

    def validate(self, attrs):
        return limpiar_texto(attrs)

    def validate_imagen_url(self, value):
        if not value:
            raise serializers.ValidationError("La imagen de la promoción es obligatoria.")
        return guardar_imagen(value, "promociones", 1080)
