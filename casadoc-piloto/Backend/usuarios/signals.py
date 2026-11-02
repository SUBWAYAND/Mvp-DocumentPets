"""Mantiene el contador de documentos de cada mascota y limpia los archivos al borrar registros."""
from django.core.files.storage import default_storage
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import DocumentoMedico, Promocion


def _borrar_archivo(ruta):
    if ruta and default_storage.exists(str(ruta)):
        default_storage.delete(str(ruta))


def _recalcular_contador(mascota):
    mascota.documentos_count = mascota.documentos.count()
    mascota.save(update_fields=["documentos_count"])


@receiver(post_save, sender=DocumentoMedico)
def documento_creado(sender, instance, created, **kwargs):
    if created:
        _recalcular_contador(instance.mascota)


@receiver(post_delete, sender=DocumentoMedico)
def documento_eliminado(sender, instance, **kwargs):
    _recalcular_contador(instance.mascota)
    _borrar_archivo(instance.archivo_url)


@receiver(post_delete, sender=Promocion)
def promocion_eliminada(sender, instance, **kwargs):
    _borrar_archivo(instance.imagen_url)
