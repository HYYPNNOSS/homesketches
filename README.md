# HomeSketches

Next.js architectural studio with a NestJS API in `../sketchback`.

## Run locally

Install dependencies in both folders:

```sh
npm install
npm --prefix ../sketchback install
cp .env.example .env.local
npm run dev
```

`npm run dev` starts Next.js on port 3000 and NestJS on port 4000. It reuses an already-running backend. Pass `-- --port 3100` to change the frontend port. Use `npm run frontend:dev` or `npm run backend:dev` to run them separately.

Browser API calls use the same-origin `/api/backend` proxy by default. Configure `BACKEND_API_URL` to point the Next.js server at another NestJS API. An explicit `NEXT_PUBLIC_API_URL` remains supported for deployments that call the API directly.

## Dashboard

- **Workspace:** image-to-video, image-to-GLB, sketch-to-plan imagery, and two-image walkthrough video. Configure the server-only `FAL_KEY` in `.env.local`; missing credentials display a setup error before any file is uploaded. Uses Kling 3 Standard, Trellis, and FLUX image-to-image. These services require an account and provider credits.
- **Text to Sketch:** Roomwright interprets descriptions and renders images. If interpretation is unavailable, the original description is sent to the render endpoint. Configure `NEXT_PUBLIC_ROOMWRIGHT_API_URL` for your service. Any public API key is visible to browsers; do not put a private provider secret there.
- **Projects:** completed Workspace, Text to Sketch, and Sketch Space renders are archived in IndexedDB. Open, download, and delete results. Provider-hosted media URLs may expire: download important outputs.
- **Assets:** image/PDF files (up to 20MB each) persist in IndexedDB. Images can be attached to Text to Sketch with “Use image”. Generation inputs accept JPG/PNG/WEBP; export PDF pages as images first.
- **Settings:** load and update the signed-in profile via `GET/PATCH /api/auth/me`. Completion-message preference is saved in this browser.

Projects and assets are local to this browser and origin, separated by signed-in account or guest workspace. They do not sync across devices. Clearing browser data removes them. Sketch Space also retains its existing local autosave.

## Authentication

Configure `sketchback/.env` with reachable PostgreSQL `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `JWT_SECRET`. Run Prisma generation and initialize the schema as described in the backend README. An unreachable database prevents account operations; the interface reports failures instead of treating them as saved changes.

API documentation: `http://localhost:4000/docs`. Health: `http://localhost:4000/health`.

## Verify dashboard behavior

With the app running, run `npm run test:dashboard`. The checks use a fresh browser session and mock AI and profile responses; they do not make paid generation requests or change database users. They cover sidebar navigation away from Sketch Space, asset persistence and attachment, text-render fallback, result archiving, generation failures and retries, 3D preview loading, profile requests, and mobile navigation.

Set `TEST_BASE_URL` for a different local port, and `CHROME_PATH` to your installed Chromium/Chrome executable (default `/opt/google/chrome/chrome`). Run `npm run build` and `npm run backend:build` for production compilation.

## Sketch Space workflow

The project bar creates, names, copies, and opens editable designs stored in IndexedDB. Drafts are scoped to the current account (or guest browser). Legacy guest autosaves are migrated on load. JSON import accepts full projects and single-floor scenes, validates geometry, and centers legacy coordinates while preserving dimensions. Imports open as a new design so the current design remains available.

Undo/redo covers the entire building, including Clear, replacing a generated layout, and deleting floors. The Enclosed room tool creates four boundary walls; selecting a room opens its name, dimensions and area in the properties panel. Moving a shared wall endpoint moves matching junctions and keeps attached openings on their walls. After resizing a room with shared walls, review the adjoining room surfaces.

Fit to plan, Reset view, zoom, scale and cursor coordinates sit above the drawing tools. On screens below 900px, “Render & design” opens the properties/render panel. Custom PNG/JPG/WEBP textures are limited to 5MB. Source snapshots and render settings are kept with completed renders; “Edit source copy” reopens a separate editable copy.

Saved cameras can be reordered for a timed WebM walkthrough. With fewer than two cameras, recording uses an orbit. GLB exports include all floors, slabs and openings; SVG exports preserve furniture scale and rotation and escape user labels.

Run `npm run test:sketch` with the app running to verify imports, undo/redo, connected editing, named persistence, rendering with a mocked provider, camera recording, exports, custom textures, and tablet controls. As with the dashboard checks, `TEST_BASE_URL` and `CHROME_PATH` are configurable.


## Multi-select and reference tracing

In Sketch Space, use Select (V), then Shift-click objects to add/remove them. Box select (B) selects objects fully inside the dragged rectangle and returns to Select. Drag an existing selection to move it together, or enter ΔX/ΔZ in the selection controls. Copy, Paste, Duplicate and Delete are also available as buttons. Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D and Ctrl/Cmd+A operate when the canvas has focus. The clipboard stays in the current editor session and works across floors. Group edits are one undo step. Rooms include their boundary walls and furnishings; copied openings include their supporting wall and attached openings. Review adjoining rooms when moving shared structures.

“Trace floor plan” imports a JPG, PNG or WEBP image (up to 20MB, resized for storage) as a locked reference on the active floor. PDF pages must first be exported as images. To calibrate, show the image, click Calibrate scale, pick two points and enter their real distance in metres. Scaling keeps the first point anchored, expands the canvas when necessary, and does not scale existing geometry. Opacity and visibility are adjustable; removing or calibrating the reference can be undone. The image and its scale survive JSON export/import and browser autosave. References are excluded from render inputs, SVG, GLB and walkthrough video.

Run `npm run test:selection` with the app running to check multi-select, linked duplication, copy/paste, group movement, undo/redo, two-point calibration, reference persistence and tablet controls. Use the same `TEST_BASE_URL` and `CHROME_PATH` options as the other browser checks.
