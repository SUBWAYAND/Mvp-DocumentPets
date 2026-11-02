from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import DocumentoMedico, Mascota, Promocion, Usuario

admin.site.register(Usuario, UserAdmin)
admin.site.register(Mascota)
admin.site.register(DocumentoMedico)
admin.site.register(Promocion)
