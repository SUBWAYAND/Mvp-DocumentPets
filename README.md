# CasaDoc — Versión piloto

Plataforma web para gestionar los **historiales médicos de mascotas**. Los clientes consultan a sus mascotas y los veterinarios cargan los documentos clínicos (fórmulas, exámenes, radiografías, certificados).

Este repositorio es una **versión piloto simplificada** del proyecto final: conserva la misma interfaz y los mismos flujos, pero el backend corre en local sin ninguna credencial ni servicio externo. El funcionamiento completo de la plataforma se presenta en el video de la entrega.

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Django 6 + Django REST Framework + JWT (SimpleJWT) |
| Base de datos | SQLite (local) |

## Cómo ejecutarlo

Necesitas **Python 3.12+** y **Node.js 20+**. Abre dos terminales.

**1. Backend** (http://localhost:8000)

```bash
cd Backend
python -m venv venv
source venv/bin/activate          # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo        # crea usuarios y mascotas ficticias
python manage.py runserver
```

**2. Frontend** (http://localhost:5173)

```bash
cd Frontend/casaDocApp
npm install
npm run dev
```

Abre http://localhost:5173 en el navegador (usa `localhost`, no `127.0.0.1`, para que la sesión funcione correctamente).

## Usuarios de demostración

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Veterinario | `vet@demo.com` | `Demo12345` |
| Cliente | `cliente@demo.com` | `Demo12345` |

Son datos ficticios creados por `seed_demo`; no corresponden a personas ni cuentas reales.

> **Registro y recuperación de contraseña:** el piloto no envía correos. El código de 6 dígitos aparece en la **terminal del backend**.

## Pruebas

```bash
cd Backend
python manage.py test usuarios
```

## Diferencias con la versión final

| Aspecto | Piloto | Versión final |
|---------|--------|---------------|
| Base de datos | SQLite | PostgreSQL |
| Archivos (fotos, PDF) | Carpeta local `media/` | Almacenamiento en la nube con URLs firmadas y temporales |
| Correos de verificación | Se imprimen en la consola | Envío real por SMTP |
| Anti-bots en login/registro | No incluido | Cloudflare Turnstile |
| Cierre de sesión | Elimina la cookie | Además invalida el token en el servidor (lista negra) |
| Límite de peticiones, monitoreo de errores, HTTPS estricto | No incluidos | Incluidos |
| Despliegue, respaldos automáticos, CI | No incluidos | Incluidos |

Los archivos de `media/` del piloto son accesibles por URL sin firma; es aceptable para una demostración local, pero **no debe usarse así con datos reales**.

## Estructura

```
Backend/
  casadoc_core/      configuración y rutas
  usuarios/          modelos, serializadores, vistas, pruebas y comando seed_demo
Frontend/casaDocApp/
  src/pages/         pantallas (login, registro, paneles de cliente y veterinario, detalle de mascota)
  src/api.js         cliente HTTP con renovación automática de sesión
```
