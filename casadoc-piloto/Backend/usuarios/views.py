import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import CodigoVerificacion, DocumentoMedico, Mascota, Promocion, Usuario
from .serializers import (
    DocumentoListSerializer,
    DocumentoSerializer,
    LoginSerializer,
    MascotaSerializer,
    PromocionSerializer,
)

COOKIE_REFRESH = "refresh_token"
SIETE_DIAS = 7 * 24 * 60 * 60


class SoloVeterinarioEscribe(permissions.BasePermission):
    """Cualquier usuario autenticado puede leer; solo el veterinario puede crear, editar o borrar."""

    message = "Acceso denegado: solo el personal veterinario puede realizar esta acción."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in permissions.SAFE_METHODS or request.user.es_veterinario


def poner_cookie_refresh(response, refresh):
    response.set_cookie(COOKIE_REFRESH, refresh, max_age=SIETE_DIAS, httponly=True,
                        secure=not settings.DEBUG, samesite="Lax")


def crear_y_enviar_codigo(usuario, tipo):
    """Genera un código de 6 dígitos (reemplaza el anterior) y lo 'envía' por correo."""
    CodigoVerificacion.objects.filter(usuario=usuario, tipo=tipo).delete()
    codigo = str(secrets.randbelow(900000) + 100000)
    CodigoVerificacion.objects.create(usuario=usuario, tipo=tipo, codigo=codigo)
    minutos = CodigoVerificacion.MINUTOS_VIGENCIA[tipo]
    asunto = "Activa tu cuenta en CasaDoc" if tipo == CodigoVerificacion.ACTIVACION else "Recupera tu contraseña en CasaDoc"
    send_mail(asunto, f"Tu código de verificación es: {codigo}\nExpira en {minutos} minutos.",
              None, [usuario.email])


def buscar_codigo(email, codigo, tipo):
    """Devuelve el código vigente que coincide, o None."""
    registro = CodigoVerificacion.objects.filter(
        usuario__email=email, tipo=tipo, codigo=str(codigo)).select_related("usuario").first()
    if registro and registro.es_valido():
        return registro
    return None


# ---------------------------------------------------------------- sesión
class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            # El refresh token viaja en una cookie HttpOnly, no en el JSON.
            poner_cookie_refresh(response, response.data.pop("refresh"))
        return response


class RefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={"refresh": request.COOKIES.get(COOKIE_REFRESH, "")})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])
        datos = serializer.validated_data
        response = Response({"access": datos["access"]})
        if datos.get("refresh"):
            poner_cookie_refresh(response, datos["refresh"])
        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({"mensaje": "Sesión cerrada."})
    response.delete_cookie(COOKIE_REFRESH)
    return response


# ---------------------------------------------------------------- registro y activación
@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    email = (request.data.get("email") or request.data.get("username") or "").strip().lower()
    password = request.data.get("password")
    if not email or not password:
        return Response({"error": "Por favor completa todos los campos."}, status=400)
    try:
        validate_password(password)
    except DjangoValidationError as e:
        return Response({"error": list(e.messages)}, status=400)

    mensaje = {"message": "Si el correo es válido y está disponible, enviamos un código de activación.",
               "email": email}
    usuario = Usuario.objects.filter(email=email).first()
    if usuario is None:
        usuario = Usuario(email=email, username=email, rol="cliente", is_active=False,
                          first_name=request.data.get("nombre_completo", ""),
                          terminos_aceptados=True,
                          version_terminos=request.data.get("version_legales", "v1.0"),
                          fecha_aceptacion=timezone.now())
        usuario.set_password(password)
        usuario.save()
    elif usuario.is_active:
        return Response(mensaje, status=status.HTTP_201_CREATED)  # no revelamos que ya existe
    crear_y_enviar_codigo(usuario, CodigoVerificacion.ACTIVACION)
    return Response(mensaje, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def activar_cuenta_view(request):
    registro = buscar_codigo(request.data.get("email"), request.data.get("codigo"),
                             CodigoVerificacion.ACTIVACION)
    if not registro:
        return Response({"error": "Código incorrecto o expirado. Solicita uno nuevo."}, status=400)
    registro.usuario.is_active = True
    registro.usuario.save(update_fields=["is_active"])
    registro.delete()
    return Response({"mensaje": "¡Cuenta activada! Ya puedes iniciar sesión."})


@api_view(["POST"])
@permission_classes([AllowAny])
def reenviar_activacion_view(request):
    usuario = Usuario.objects.filter(email=request.data.get("email"), is_active=False).first()
    if usuario:
        crear_y_enviar_codigo(usuario, CodigoVerificacion.ACTIVACION)
    return Response({"message": "Si el correo está pendiente de activación, se envió un nuevo código."})


# ---------------------------------------------------------------- recuperación de contraseña
@api_view(["POST"])
@permission_classes([AllowAny])
def solicitar_codigo_view(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "El correo es obligatorio."}, status=400)
    usuario = Usuario.objects.filter(email=email, is_active=True).first()
    if usuario:
        crear_y_enviar_codigo(usuario, CodigoVerificacion.RECUPERACION)
    return Response({"mensaje": "Si el correo existe, te enviamos un código de recuperación."})


@api_view(["POST"])
@permission_classes([AllowAny])
def validar_codigo_view(request):
    if not buscar_codigo(request.data.get("email"), request.data.get("codigo"),
                         CodigoVerificacion.RECUPERACION):
        return Response({"error": "Código inválido o expirado."}, status=400)
    return Response({"mensaje": "Código válido."})


@api_view(["POST"])
@permission_classes([AllowAny])
def restablecer_password_view(request):
    nueva = request.data.get("nueva_password")
    registro = buscar_codigo(request.data.get("email"), request.data.get("codigo"),
                             CodigoVerificacion.RECUPERACION)
    if not registro or not nueva:
        return Response({"error": "Código inválido, expirado o datos incompletos."}, status=400)
    try:
        validate_password(nueva, user=registro.usuario)
    except DjangoValidationError as e:
        return Response({"error": list(e.messages)}, status=400)
    registro.usuario.set_password(nueva)
    registro.usuario.save()
    registro.delete()
    return Response({"mensaje": "¡Contraseña actualizada correctamente!"})


# ---------------------------------------------------------------- perfil
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def perfil_view(request):
    user = request.user
    if request.method == "GET":
        return Response({"username": user.username, "email": user.email,
                         "nombre_completo": user.first_name, "rol": user.rol})

    data = request.data
    user.first_name = data.get("nombre_completo", user.first_name)
    user.email = data.get("email", user.email)
    response = Response({"mensaje": "Perfil actualizado con éxito."})

    actual, nueva = data.get("password_actual"), data.get("nueva_password")
    if actual and nueva:
        if not user.check_password(actual):
            return Response({"error": "La contraseña actual es incorrecta."}, status=400)
        try:
            validate_password(nueva, user=user)
        except DjangoValidationError as e:
            return Response({"error": list(e.messages)}, status=400)
        user.set_password(nueva)
        response.delete_cookie(COOKIE_REFRESH)
        response.data["mensaje"] = "Contraseña actualizada. Inicia sesión nuevamente."
    try:
        user.save()
    except IntegrityError:
        return Response({"error": "Ese correo ya está registrado."}, status=400)
    return response


# ---------------------------------------------------------------- mascotas
class MascotaListCreateView(generics.ListCreateAPIView):
    serializer_class = MascotaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["nombre", "raza"]

    def get_queryset(self):
        qs = Mascota.objects.all() if self.request.user.es_veterinario else Mascota.objects.filter(owner=self.request.user)
        return qs.order_by("-id")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MascotaDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MascotaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Mascota.objects.all() if self.request.user.es_veterinario else Mascota.objects.filter(owner=self.request.user)


# ---------------------------------------------------------------- documentos médicos
def documentos_visibles(user):
    return DocumentoMedico.objects.all() if user.es_veterinario else DocumentoMedico.objects.filter(mascota__owner=user)


class DocumentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [SoloVeterinarioEscribe]

    def get_serializer_class(self):
        return DocumentoListSerializer if self.request.method == "GET" else DocumentoSerializer

    def get_queryset(self):
        qs = documentos_visibles(self.request.user)
        mascota_id = self.request.query_params.get("mascota_id")
        if mascota_id:
            qs = qs.filter(mascota_id=mascota_id)
        return qs.order_by("-fecha", "-id")


class DocumentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentoSerializer
    permission_classes = [SoloVeterinarioEscribe]

    def get_queryset(self):
        return documentos_visibles(self.request.user)


class DocumentoDescargaView(APIView):
    """Devuelve la URL para ver/descargar el archivo, solo si el usuario tiene permiso.

    PILOTO: la URL apunta a ./media. En producción debería ser una URL firmada y temporal
    de un almacenamiento privado (S3/R2), no un archivo público.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        documento = get_object_or_404(documentos_visibles(request.user), pk=pk)
        if not documento.archivo_url:
            return Response({"error": "El documento no tiene archivo adjunto."}, status=404)
        url = request.build_absolute_uri(default_storage.url(str(documento.archivo_url)))
        return Response({"url": url})


# ---------------------------------------------------------------- promociones
class PromocionViewSet(viewsets.ModelViewSet):
    serializer_class = PromocionSerializer
    permission_classes = [SoloVeterinarioEscribe]
    queryset = Promocion.objects.filter(activa=True).order_by("-fecha_creacion")
