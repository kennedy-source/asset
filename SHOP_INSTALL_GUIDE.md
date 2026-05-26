# PAJOY Shop Computer Install Guide

Use this when moving the app to the shop computer.

## First-Time Setup

1. Install Docker Desktop on the shop computer.
2. Copy this whole `Asset-Manager` folder to the shop computer.
3. Open the folder.
4. Double-click `setup.bat`.
5. Wait until it finishes building and starting the services.
6. Open `http://localhost:3000`.

Default login:

- Email: `admin@pajoy.co.ke`
- Password: `Admin@1234`

Change the password after the first login.

## Daily Use

- Start the app: double-click `start.bat`
- Stop the app: double-click `stop.bat`
- App address: `http://localhost:3000`

## When You Make Code Changes

Run this from the project folder:

```bat
docker-compose up -d --build
```

That rebuilds the app so the new pages and fixes are shown.

## Notes

- Keep Docker Desktop running before starting PAJOY.
- Do not delete the `postgres` Docker volume unless you intentionally want to remove the shop data.
- The app is local to the computer, so it will keep running there without needing an external server.
