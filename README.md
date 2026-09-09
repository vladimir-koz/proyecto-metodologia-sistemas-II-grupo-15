# API de entrenamientos

Backend REST para administrar ejercicios, rutinas, planes semanales y entrenamientos. Se utiliza como proyecto integrador de Metodología de Sistemas II.

## Estado actual

- API funcional con autenticación JWT y PostgreSQL.
- Migraciones y datos de demostración mediante Sequelize.
- 15 pruebas smoke de HTTP, autenticación y validaciones.
- Entorno reproducible con Docker Compose.
- Sin frontend, CI ni pruebas de integración con PostgreSQL por el momento.

## Tecnologías

- Node.js 24 LTS, TypeScript y Express 4.
- PostgreSQL 17 y Sequelize 6.
- Jest y Supertest.
- Docker, Docker Compose y pgAdmin 4.

El repositorio incluye `package.json` y `package-lock.json`. Las instalaciones reproducibles deben realizarse con `npm ci`.

## Requisitos

Para el camino recomendado solamente se necesita:

- Git;
- Docker Engine o Docker Desktop;
- Docker Compose v2.

## Inicio rápido con Docker

### 1. Clonar

Reemplazar los marcadores antes de entregar:

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
```

### 2. Iniciar y preparar

Desde la raíz del repositorio:

```bash
docker compose up -d --build
docker compose exec backend npm run db:setup
curl http://localhost:3001/api/health
```

Respuesta esperada del healthcheck:

```json
{
  "status": "OK",
  "message": "API funcionando correctamente",
  "timestamp": "...",
  "environment": "development"
}
```

`db:setup` ejecuta primero las migraciones y después los seeders. No se cargan datos demo automáticamente en la imagen de producción.

## Servicios locales

| Servicio | Dirección |
| --- | --- |
| API | http://localhost:3001/api |
| Health | http://localhost:3001/api/health |
| PostgreSQL | `localhost:5432` |
| pgAdmin | http://localhost:5050 |

La aplicación no consume APIs externas durante su ejecución. La primera construcción requiere internet para descargar paquetes de npm e imágenes de Docker.

### pgAdmin

Acceso local:

```text
Email: admin@admin.com
Password: admin
```

Conexión a PostgreSQL desde pgAdmin:

```text
Host: database
Port: 5432
Database: app_database
User: app_user
Password: app_password
```

Son credenciales públicas destinadas exclusivamente al entorno local.

## Cuenta demo

Disponible después de ejecutar `db:setup`:

```text
Email: demo@powerup.com
Password: Demo1234!
```

Ejemplo de login:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@powerup.com","password":"Demo1234!"}'
```

Las demás rutas requieren el encabezado `Authorization: Bearer <TOKEN>`.

## Configuración

Docker Compose ya proporciona la configuración local. Para ejecutar Node.js fuera de Docker se debe copiar el ejemplo:

```bash
cp backend/.env.example backend/.env
```

Variables principales:

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto de la API; por defecto 3001 |
| `DB_HOST`, `DB_PORT` | Ubicación de PostgreSQL |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Credenciales de la base |
| `DATABASE_URL` | Conexión alternativa mediante URL |
| `DB_SSL` | Activa SSL cuando vale `true` |
| `JWT_SECRET` | Obligatoria para firmar tokens |
| `CORS_ORIGIN` | Origen permitido para un cliente web |

Dentro de Compose, PostgreSQL se encuentra en `database:5432`. Cuando Node.js se ejecuta localmente se utiliza `localhost:5432`.

Nunca se deben versionar `.env`, secretos ni credenciales reales. `backend/.env.example` sí se versiona porque documenta el contrato sin incluir secretos reales.

## Alternativa sin contenerizar Node.js

En este modo PostgreSQL y pgAdmin se ejecutan en Docker, pero la API se ejecuta directamente en la computadora. Requiere Node.js 24; `.nvmrc` y `engines.node` declaran esa versión.

Desde la raíz, detener el backend de Docker para liberar el puerto 3001 e iniciar solamente los servicios necesarios:

```bash
docker compose stop backend
docker compose up -d database pgadmin
```

Después:

```bash
cd backend
nvm use
cp .env.example .env
npm ci
npm run db:setup
npm run dev
```

La copia de `.env.example` se realiza solamente la primera vez. Si `npm ci` falla, no continuar con `db:setup` ni `dev`, porque todavía no estarán instaladas sus herramientas.

## Comandos principales

Ejecutar desde `backend/` o anteponer `docker compose exec backend`:

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia la API con recarga |
| `npm run build` | Compila TypeScript |
| `npm start` | Ejecuta el código compilado |
| `npm run migrate` | Aplica migraciones |
| `npm run seed` | Carga datos iniciales |
| `npm run db:setup` | Ejecuta migraciones y seeders |
| `npm test` | Compila y ejecuta los tests |

## Datos iniciales

Los seeders crean 10 grupos musculares, 12 ejercicios, 3 rutinas, un programa de cuatro semanas, 12 entrenamientos demo y 144 series.

Repetir `db:setup` no duplica los catálogos. La actividad demo se reemplaza y sus fechas se recalculan respecto de la semana actual.

## Estructura

```text
.
├── backend/
│   ├── config/       # configuración de Sequelize CLI
│   ├── migrations/   # esquema de base de datos
│   ├── seeders/      # datos iniciales y demo
│   ├── src/          # API organizada por capas
│   ├── tests/        # pruebas smoke
│   ├── .dockerignore
│   ├── .env.example
│   ├── .nvmrc
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── jest.config.js
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

La arquitectura sigue el flujo `routes → middlewares/validators → controllers → services → repositories → Sequelize → PostgreSQL`.

## Pruebas

```bash
cd backend
npm ci
npm test
```

La suite contiene 15 pruebas smoke. Comprueba healthchecks, 404, autenticación y validaciones antes de consultar la base. No prueba PostgreSQL ni toda la lógica de negocio; las pruebas de integración quedan pendientes.

## Operación y problemas frecuentes

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f database
docker compose stop
```

### Puertos ocupados

Compose necesita publicar los puertos 3001 (API), 5432 (PostgreSQL) y 5050 (pgAdmin). Si aparece `port is already allocated` o `Bind failed`, primero identificar qué los está usando:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Si pertenecen a contenedores de otro proyecto, se pueden detener sin borrar sus datos:

```bash
docker stop <NOMBRE_DEL_CONTENEDOR>
```

En Windows PowerShell también se pueden consultar procesos locales:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 3001, 5432, 5050 }
```

No se debe finalizar un proceso desconocido ni usar `docker compose down -v` para resolver una colisión de puertos.

### Backend `unhealthy` o error `EAI_AGAIN database`

Un primer arranque fallido puede dejar contenedores sin conectar correctamente a la red interna. Recrearlos sin borrar los volúmenes:

```bash
docker compose down
docker compose up -d --build --force-recreate
docker compose ps
```

Esperar hasta que `database` y `backend` estén `healthy`. Recién entonces ejecutar:

```bash
docker compose exec backend npm run db:setup
curl http://localhost:3001/api/health
```

Si el backend continúa sin responder:

```bash
docker compose restart backend
docker compose logs --tail=100 backend
```

### Consideraciones para Windows

- Iniciar Docker Desktop y esperar a que el motor esté listo.
- Ejecutar los comandos desde la raíz, donde se encuentra `docker-compose.yml`.
- Utilizar `docker compose` y no el comando antiguo `docker-compose`.
- En PowerShell usar `curl.exe http://localhost:3001/api/health` para evitar el alias `curl` de algunas versiones.

### `npm ci` devuelve `EACCES` después de usar Docker

Docker puede dejar un directorio vacío `backend/node_modules` con otro propietario. Desde la raíz del repositorio, detener el backend de Docker, eliminar únicamente ese directorio vacío y reinstalar localmente:

```bash
docker compose stop backend
rmdir backend/node_modules
cd backend
npm ci
```

No ejecutar `sudo npm ci`. Si `rmdir` indica que el directorio no está vacío, revisar su contenido antes de eliminarlo.

Si faltan tablas o datos en el modo Docker, ejecutar `docker compose exec backend npm run db:setup`.

Para borrar todos los datos locales y reconstruir desde cero:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npm run db:setup
```

`docker compose down -v` es destructivo: elimina los volúmenes y la base local.

## Integrantes — completar antes de entregar
