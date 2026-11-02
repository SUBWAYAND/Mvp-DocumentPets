import base64
from io import BytesIO

from django.core import mail
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import CodigoVerificacion, DocumentoMedico, Mascota, Usuario

PDF_B64 = "data:application/pdf;base64," + base64.b64encode(b"%PDF-1.4 prueba").decode()


def imagen_b64():
    buf = BytesIO()
    Image.new("RGB", (50, 50), "red").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@override_settings(MEDIA_ROOT="/tmp/casadoc_test_media")
class CasaDocTests(APITestCase):
    def setUp(self):
        self.vet = Usuario.objects.create_user("vet@t.com", "vet@t.com", "Clave12345", rol="veterinario")
        self.ana = Usuario.objects.create_user("ana@t.com", "ana@t.com", "Clave12345")
        self.beto = Usuario.objects.create_user("beto@t.com", "beto@t.com", "Clave12345")
        self.luna = Mascota.objects.create(owner=self.ana, nombre="Luna", especie="Perro", raza="Mestizo", peso=10)

    def login(self, usuario):
        r = self.client.post("/api/auth/login/", {"username": usuario.email, "password": "Clave12345"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        return r

    # --- autenticación
    def test_registro_activacion_y_login(self):
        r = self.client.post("/api/auth/register/", {"email": "nuevo@t.com", "password": "Clave12345",
                                                     "nombre_completo": "Nuevo"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        nuevo = Usuario.objects.get(email="nuevo@t.com")
        self.assertFalse(nuevo.is_active)
        codigo = CodigoVerificacion.objects.get(usuario=nuevo).codigo
        mal = self.client.post("/api/auth/activar-cuenta/", {"email": "nuevo@t.com", "codigo": "000000"}, format="json")
        self.assertEqual(mal.status_code, 400)
        ok = self.client.post("/api/auth/activar-cuenta/", {"email": "nuevo@t.com", "codigo": codigo}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.login(nuevo)

    def test_login_entrega_refresh_en_cookie_y_se_puede_renovar(self):
        r = self.login(self.ana)
        self.assertNotIn("refresh", r.data)
        self.assertEqual(r.data["rol"], "cliente")
        self.assertIn("refresh_token", r.cookies)
        r2 = self.client.post("/api/auth/refresh/", format="json")
        self.assertEqual(r2.status_code, 200)
        self.assertIn("access", r2.data)

    def test_recuperar_password(self):
        self.client.post("/api/auth/solicitar-codigo/", {"email": "ana@t.com"}, format="json")
        codigo = CodigoVerificacion.objects.get(usuario=self.ana).codigo
        r = self.client.post("/api/auth/restablecer-password/",
                             {"email": "ana@t.com", "codigo": codigo, "nueva_password": "OtraClave98765"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(Usuario.objects.get(pk=self.ana.pk).check_password("OtraClave98765"))

    # --- mascotas
    def test_cliente_solo_ve_sus_mascotas_y_el_vet_ve_todas(self):
        self.login(self.beto)
        self.assertEqual(self.client.get("/api/mascotas/").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/mascotas/{self.luna.id}/").status_code, 404)
        self.login(self.vet)
        self.assertEqual(self.client.get("/api/mascotas/").data["count"], 1)

    def test_crear_mascota_con_foto_devuelve_url_absoluta(self):
        self.login(self.ana)
        r = self.client.post("/api/mascotas/", {"nombre": "Rex", "especie": "Perro", "raza": "Pug", "peso": "8",
                                                "fecha_nacimiento": "2022-01-01", "imagen": imagen_b64()}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["imagen_url"].startswith("http://testserver/media/mascotas/"))
        self.assertNotIn("imagen", r.data)

    # --- documentos
    def test_solo_el_veterinario_crea_documentos(self):
        payload = {"mascota": self.luna.id, "titulo": "Radiografía", "tipo": "Radiografía",
                   "medico": "Dra. X", "archivo_url": PDF_B64}
        self.login(self.ana)
        self.assertEqual(self.client.post("/api/documentos/", payload, format="json").status_code, 403)
        self.login(self.vet)
        r = self.client.post("/api/documentos/", payload, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.luna.refresh_from_db()
        self.assertEqual(self.luna.documentos_count, 1)

    def test_rechaza_pdf_falso(self):
        self.login(self.vet)
        falso = "data:application/pdf;base64," + base64.b64encode(b"no soy pdf").decode()
        r = self.client.post("/api/documentos/", {"mascota": self.luna.id, "titulo": "X", "tipo": "X",
                                                  "medico": "Y", "archivo_url": falso}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_descarga_respeta_propiedad_del_documento(self):
        doc = DocumentoMedico.objects.create(mascota=self.luna, titulo="T", tipo="T", medico="M", archivo_url="documentos/x.pdf")
        self.login(self.beto)
        self.assertEqual(self.client.get(f"/api/documentos/{doc.id}/descargar/").status_code, 404)
        self.login(self.ana)
        r = self.client.get(f"/api/documentos/{doc.id}/descargar/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["url"].endswith("/media/documentos/x.pdf"))

    def test_html_se_elimina_de_los_textos(self):
        self.login(self.vet)
        r = self.client.post("/api/documentos/", {"mascota": self.luna.id, "titulo": "<script>x</script>Hola",
                                                  "tipo": "T", "medico": "M"}, format="json")
        self.assertEqual(r.data["titulo"], "xHola")

    # --- promociones
    def test_promociones_solo_las_publica_el_veterinario(self):
        self.login(self.ana)
        self.assertEqual(self.client.post("/api/promociones/", {"titulo": "P", "imagen_url": imagen_b64()}, format="json").status_code, 403)
        self.login(self.vet)
        r = self.client.post("/api/promociones/", {"titulo": "Promo", "imagen_url": imagen_b64()}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.login(self.ana)
        lista = self.client.get("/api/promociones/").data
        self.assertTrue(lista["results"][0]["imagen_url_firmada"].startswith("http"))
