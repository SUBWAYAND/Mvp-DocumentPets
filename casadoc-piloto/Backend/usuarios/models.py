from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Usuario(AbstractUser):
    ROLES = (("cliente", "Cliente"), ("veterinario", "Veterinario"))

    rol = models.CharField(max_length=20, choices=ROLES, default="cliente")
    email = models.EmailField(unique=True)
    terminos_aceptados = models.BooleanField(default=False)
    version_terminos = models.CharField(max_length=20, null=True, blank=True)
    fecha_aceptacion = models.DateTimeField(null=True, blank=True)

    @property
    def es_veterinario(self):
        return self.rol == "veterinario"

    def __str__(self):
        return f"{self.username} ({self.rol})"


class Mascota(models.Model):
    owner = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="mascotas")
    nombre = models.CharField(max_length=100)
    especie = models.CharField(max_length=50)
    raza = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    edad = models.PositiveIntegerField(null=True, blank=True)
    peso = models.DecimalField(max_digits=5, decimal_places=2)
    fecha_ultima_visita = models.DateField(null=True, blank=True)
    documentos_count = models.PositiveIntegerField(default=0)
    imagen = models.TextField(blank=True, null=True)  # ruta del archivo guardado

    def __str__(self):
        return f"{self.nombre} (dueño: {self.owner.username})"


class DocumentoMedico(models.Model):
    mascota = models.ForeignKey(Mascota, on_delete=models.CASCADE, related_name="documentos")
    titulo = models.CharField(max_length=200)
    tipo = models.CharField(max_length=100)
    medico = models.CharField(max_length=150)
    fecha = models.DateField(auto_now_add=True)
    descripcion = models.TextField(blank=True, null=True)
    archivo_url = models.TextField(blank=True, null=True)  # ruta del archivo guardado

    def __str__(self):
        return f"{self.titulo} - {self.mascota.nombre}"


class CodigoVerificacion(models.Model):
    """Código de 6 dígitos para activar la cuenta o recuperar la contraseña."""

    ACTIVACION = "activacion"
    RECUPERACION = "recuperacion"
    TIPOS = ((ACTIVACION, "Activación"), (RECUPERACION, "Recuperación"))
    MINUTOS_VIGENCIA = {ACTIVACION: 2, RECUPERACION: 10}

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="codigos")
    tipo = models.CharField(max_length=20, choices=TIPOS)
    codigo = models.CharField(max_length=6)
    creado = models.DateTimeField(auto_now_add=True)

    def es_valido(self):
        return timezone.now() <= self.creado + timedelta(minutes=self.MINUTOS_VIGENCIA[self.tipo])

    def __str__(self):
        return f"{self.tipo} - {self.usuario.username}"


class Promocion(models.Model):
    titulo = models.CharField(max_length=200)
    imagen_url = models.TextField()  # ruta del archivo guardado
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo
