from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from usuarios import views

router = DefaultRouter()
router.register(r"promociones", views.PromocionViewSet, basename="promocion")

urlpatterns = [
    path("admin/", admin.site.urls),
    # --- Autenticación ---
    path("api/auth/login/", views.LoginView.as_view()),
    path("api/auth/refresh/", views.RefreshView.as_view()),
    path("api/auth/logout/", views.logout_view),
    path("api/auth/register/", views.register_view),
    path("api/auth/activar-cuenta/", views.activar_cuenta_view),
    path("api/auth/reenviar-activacion/", views.reenviar_activacion_view),
    path("api/auth/solicitar-codigo/", views.solicitar_codigo_view),
    path("api/auth/validar-codigo/", views.validar_codigo_view),
    path("api/auth/restablecer-password/", views.restablecer_password_view),
    path("api/auth/perfil/", views.perfil_view),
    # --- Mascotas ---
    path("api/mascotas/", views.MascotaListCreateView.as_view()),
    path("api/mascotas/<int:pk>/", views.MascotaDetailView.as_view()),
    # --- Documentos médicos ---
    path("api/documentos/", views.DocumentoListCreateView.as_view()),
    path("api/documentos/<int:pk>/", views.DocumentoDetailView.as_view()),
    path("api/documentos/<int:pk>/descargar/", views.DocumentoDescargaView.as_view()),
    # --- Promociones ---
    path("api/", include(router.urls)),
]

# En el piloto los archivos subidos se sirven directamente desde ./media
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
