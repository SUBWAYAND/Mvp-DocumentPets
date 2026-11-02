from django.core.management.base import BaseCommand

from usuarios.models import DocumentoMedico, Mascota, Usuario

PASSWORD_DEMO = "Demo12345"


class Command(BaseCommand):
    help = "Crea datos ficticios de demostración (un veterinario, un cliente, mascotas y documentos)."

    def handle(self, *args, **options):
        vet, _ = Usuario.objects.get_or_create(
            email="vet@demo.com",
            defaults={"username": "vet@demo.com", "first_name": "Dra. Ana Demo", "rol": "veterinario"})
        cliente, _ = Usuario.objects.get_or_create(
            email="cliente@demo.com",
            defaults={"username": "cliente@demo.com", "first_name": "Carlos Demo", "rol": "cliente"})
        for u in (vet, cliente):
            u.set_password(PASSWORD_DEMO)
            u.is_active = True
            u.save()

        luna, _ = Mascota.objects.get_or_create(owner=cliente, nombre="Luna", defaults={
            "especie": "Perro", "raza": "Labrador", "fecha_nacimiento": "2021-03-10", "edad": 5, "peso": "24.5"})
        Mascota.objects.get_or_create(owner=cliente, nombre="Mishi", defaults={
            "especie": "Gato", "raza": "Siamés", "fecha_nacimiento": "2023-07-02", "edad": 3, "peso": "4.2"})

        if not luna.documentos.exists():
            DocumentoMedico.objects.create(mascota=luna, titulo="Fórmula Médica", tipo="Fórmula Médica",
                                           medico=vet.first_name, descripcion="Desparasitación cada 3 meses.")
            DocumentoMedico.objects.create(mascota=luna, titulo="Certificados", tipo="Certificados",
                                           medico=vet.first_name, descripcion="Certificado de vacunación al día.")

        self.stdout.write(self.style.SUCCESS(
            f"Datos de demostración listos.\n  Veterinario: vet@demo.com / {PASSWORD_DEMO}\n"
            f"  Cliente:     cliente@demo.com / {PASSWORD_DEMO}"))
