# HomeSketches

HomeSketches is a Next.js frontend with one NestJS backend for turning sketches and reference images into architectural media.

## Project structure

- `app/`: marketing site, authentication, and `/dashboard`
- `components/dashboard/`: reusable upload, progress, and result viewer components
- `../homesketches-backendend/`: the only backend, with auth and four generation modules

## Run locally

```bash
npm install
cd ../homesketches-backendend && npm install && cd ../homesketches-frontend
cp .env.example .env.local
cp backend/.env.example backend/.env
npm run dev
npm run backend:dev
```

Frontend: `http://localhost:3000`  
API: `http://localhost:4000/api`  
Swagger: `http://localhost:4000/docs`

## Generation API

- `POST /api/sketch-to-video/generate`: one sketch to video
- `POST /api/sketch-to-3d/generate`: one sketch to GLB model
- `POST /api/sketch-to-plan/generate`: one sketch to floor plan
- `POST /api/multi-image-to-3d/generate`: two to twelve images to a queued walkthrough
- `GET /api/multi-image-to-3d/:jobId`: poll walkthrough status

The AI calls are behind `GenerationProvider` and currently return placeholder result URLs. Replace `PlaceholderGenerationProvider` with real model adapters without changing the controllers or dashboard.
