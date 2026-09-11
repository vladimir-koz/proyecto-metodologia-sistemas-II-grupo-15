# API de entrenamientos

API REST para gestionar ejercicios, rutinas, planes semanales y entrenamientos. Proyecto de Metodología de Sistemas II desarrollado con Node.js, TypeScript, Express, Sequelize y PostgreSQL.

## Cómo levantar el proyecto

Elegir **una sola** de las siguientes opciones. Cada opción comienza desde un clon nuevo y no depende de haber ejecutado las anteriores.

### Opción 1 — Todo con Docker (recomendada)

Requisitos:

- Git.
- Docker Desktop o Docker Engine en ejecución.
- Docker Compose v2.

No requiere instalar Node.js ni PostgreSQL.

Desde una terminal:

```bash
git clone https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15
docker compose up -d --build
docker compose exec backend npm run db:setup
curl http://localhost:3001/api/health
```

En Windows PowerShell, utilizar `curl.exe` en el último comando.

Para detener todo sin borrar la base:

```bash
docker compose down
```

### Opción 2 — Backend local y PostgreSQL con Docker

Requisitos:

- Git.
- Docker Desktop o Docker Engine en ejecución.
- Docker Compose v2.
- Node.js 24 y npm.

Desde una terminal:

```bash
git clone https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15
docker compose up -d database pgadmin
cd backend
cp .env.example .env
node --version
npm ci
npm run db:setup
npm run dev
```

En Windows PowerShell, reemplazar la copia del archivo por:

```powershell
Copy-Item .env.example .env
```

Dejar `npm run dev` ejecutándose. En otra terminal comprobar:

```bash
curl http://localhost:3001/api/health
```

Para detener la API, presionar `Ctrl+C`. Para detener PostgreSQL y pgAdmin:

```bash
cd ..
docker compose down
```

### Opción 3 — Todo local, sin Docker

Requisitos:

- Git.
- Node.js 24 y npm.
- PostgreSQL 17 instalado y en ejecución.

Primero abrir PostgreSQL como administrador. En Linux normalmente se utiliza `sudo -u postgres psql`; en Windows se puede usar SQL Shell (`psql`) o `psql -U postgres`. Ejecutar una sola vez:

```sql
CREATE USER app_user WITH PASSWORD 'app_password';
CREATE DATABASE app_database OWNER app_user;
\q
```

Después, desde una terminal:

```bash
git clone https://github.com/vladimir-koz/proyecto-metodologia-sistemas-II-grupo-15.git
cd proyecto-metodologia-sistemas-II-grupo-15/backend
cp .env.example .env
node --version
npm ci
npm run db:setup
npm run dev
```

En Windows PowerShell, reemplazar `cp .env.example .env` por `Copy-Item .env.example .env`.

Dejar `npm run dev` ejecutándose. En otra terminal comprobar:

```bash
curl http://localhost:3001/api/health
```

Para detener la API, presionar `Ctrl+C`. PostgreSQL se detiene desde el administrador de servicios del sistema operativo.

## Verificación y accesos

- API: http://localhost:3001/api
- Healthcheck: http://localhost:3001/api/health
- PostgreSQL: `localhost:5432`
- pgAdmin, solamente en las opciones 1 y 2: http://localhost:5050

El healthcheck debe responder con `"status": "OK"`.

Credenciales locales:

| Uso | Usuario | Contraseña |
| --- | --- | --- |
| Cuenta demo de la API | `demo@powerup.com` | `Demo1234!` |
| pgAdmin | `admin@admin.com` | `admin` |
| PostgreSQL | `app_user` | `app_password` |

En pgAdmin conectar al host `database`, puerto `5432` y base `app_database`. Estas credenciales son únicamente para desarrollo local.

## Configuración reproducible

- Node.js debe ser versión 24. `node --version` debe comenzar con `v24`.
- En Linux y macOS, `backend/.nvmrc` permite seleccionar esa versión con `nvm use`; NVM es opcional. En Windows se puede instalar Node.js 24 directamente o utilizar un administrador de versiones compatible.
- `package-lock.json` se versiona y las dependencias se instalan con `npm ci`.
- Para ejecutar la API local se copia `.env.example` como `.env`.
- Docker Compose ya aporta sus variables y no necesita ese `.env`.
- `.env`, `node_modules`, `dist`, cobertura, logs y secretos no se versionan.

Dentro de Docker, la API usa `database:5432`; ejecutada localmente usa `localhost:5432`. `JWT_SECRET` es obligatorio.

## Comandos del backend

Esta sección es una referencia para desarrollar y mantener el backend; **no es una cuarta forma de levantar el proyecto**. Para el primer arranque se debe seguir completa una de las opciones 1, 2 o 3.

La forma de ejecutar estos comandos depende de la opción elegida:

- En la opción 1, desde la raíz: `docker compose exec backend <COMANDO>`; por ejemplo, `docker compose exec backend npm test`.
- En las opciones 2 y 3, entrar en `backend/` y ejecutar el comando directamente.
- `npm ci` se ejecuta en la computadora solamente en las opciones 2 y 3. En la opción 1 las dependencias se instalan al construir la imagen Docker.

| Comando | Cuándo utilizarlo |
| --- | --- |
| `npm ci` | Después de clonar o cuando cambia `package-lock.json`. Reinstala exactamente las dependencias registradas en el lockfile. |
| `npm run dev` | Para desarrollar en las opciones 2 o 3. Inicia la API con recarga automática y mantiene ocupada la terminal. |
| `npm run build` | Para comprobar que TypeScript compila. Genera el directorio `dist/`. |
| `npm start` | Para ejecutar el contenido ya compilado de `dist/`, sin recarga automática. Antes requiere `npm run build`. |
| `npm run migrate` | Cuando solamente se necesita crear o actualizar las tablas de PostgreSQL. No carga datos demo. |
| `npm run seed` | Cuando las tablas ya existen y solamente se necesitan los datos demo. |
| `npm run db:setup` | En el primer arranque. Ejecuta migraciones y luego seeders; es el comando habitual para preparar la base. |
| `npm test` | Para verificar cambios. Primero compila el proyecto y después ejecuta las 15 pruebas smoke. |

Los comandos `npm` y `docker compose` son iguales en Linux, macOS y PowerShell. Las diferencias necesarias ya están indicadas en las opciones de arranque: `cp` en Linux/macOS, `Copy-Item` en PowerShell y el acceso a PostgreSQL como administrador en la opción 3.

Hay 15 pruebas smoke de HTTP, autenticación y validaciones; no prueban PostgreSQL ni toda la lógica de negocio.

## Organización

`backend/src` contiene la API; `backend/migrations` el esquema; `backend/seeders` los datos demo; y `backend/tests` las pruebas. El flujo principal es `routes → validators/middlewares → controllers → services → repositories → Sequelize → PostgreSQL`.

## Documentación de la API

- [Contrato técnico de endpoints](docs/API.md)
- [Colección de peticiones para REST Client](requests.http)

## Problemas frecuentes

### Puerto ocupado

Los puertos utilizados son 3001, 5432 y 5050. Ver contenedores que ya los estén usando:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

En Windows PowerShell:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 3001, 5432, 5050 }
```

Detener solamente el proceso o contenedor conocido que provoca el conflicto.

### Backend `unhealthy` o error `EAI_AGAIN database`

Desde la raíz, recrear los contenedores sin borrar la base:

```bash
docker compose down
docker compose up -d --build --force-recreate
docker compose ps
```

### Error `EACCES` en `backend/node_modules`

Este problema puede aparecer al pasar del backend en Docker al backend local. Desde la raíz:

```bash
docker compose stop backend
rmdir backend/node_modules
cd backend
npm ci
```

No ejecutar `sudo npm ci`. `rmdir` solamente elimina el directorio si está vacío.

### Borrar la base Docker y comenzar de nuevo

El siguiente comando es destructivo y elimina todos los datos locales:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npm run db:setup
```

## Integrantes
- Conrado Lanusse
- Francisco Jaszczuk
- Jano Rodriguez
- Vladimir Kozik