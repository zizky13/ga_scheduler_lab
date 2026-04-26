# ga_scheduler_lab

A **Genetic Algorithm (GA)-based academic course scheduler** built as a full-stack application with TypeScript. This project solves the university timetabling problem by evolving a population of candidate schedules over multiple generations, minimising hard constraint violations (room and lecturer conflicts) and soft constraint penalties (workload balance for structural lecturers).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database](#database)
- [REST API](#rest-api)
- [Pre-GA Pipeline](#pre-ga-pipeline)
- [Genetic Algorithm Engine](#genetic-algorithm-engine)
- [Conflict-Aware Repair](#conflict-aware-repair)
- [Crossover Operators](#crossover-operators)
- [Tests](#tests)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Changelog](#changelog)

---

## Overview

The application features a modern React frontend powered by an Express.js REST API. 

The core scheduling logic works in two phases:

1. **Pre-GA Phase** — Each course offering is validated against six constraint categories (data integrity, room capacity, temporal sufficiency, facility compatibility, lecturer availability, and academic policy). Only *feasible* offerings become candidates for the GA.

2. **GA Phase** — A population of chromosomes (candidate timetables) is evolved using selection, crossover, and mutation. Fitness is evaluated based on hard violations (conflicting room/time or lecturer/time assignments) and a soft penalty for overloaded structural lecturers.

---

## Architecture

```text
React Frontend (Vite, TailwindCSS, Zustand)
      │
      ▼ REST API
Express Backend (Routes, Validation, Rate Limiting)
      │
      ▼ 
Database (SQLite / Prisma)
      │
      ▼
Pre-GA Validator  ──►  6 constraint checks  ──►  PreGACandidate[]
      │
      ▼
GA Engine
  ├── generateInitialPopulation  ──►  repairChromosome (initial repair)
  ├── evaluateFitness (hard + soft)
  ├── tournamentSelection
  ├── crossover (singlePoint | uniform | PMX)
  ├── mutateChromosome
  ├── repairChromosome (post-mutation repair)  ◄── NEW
  └── elitism
      │
      ▼
  fitness history[]  (per-generation best & avg fitness)
```

---

## Project Structure

```text
ga_scheduler_lab/
├── frontend/                  # React + Vite frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Route pages
│   │   ├── store/             # Zustand state management
│   │   └── ...
├── prisma/                    # Database schema and migrations
├── src/
│   ├── api/                   # Express backend API
│   │   ├── app.ts             # Express app setup (security, CORS, rate limits)
│   │   ├── server.ts          # API server entry point
│   │   ├── middleware/        # Error handlers and async wrappers
│   │   ├── routes/            # REST endpoints (CRUD & Scheduler)
│   │   └── services/          # API business logic
│   ├── db/                    # Prisma client and seed script
│   ├── ga/                    # Core Genetic Algorithm Engine
│   ├── crossovers/            # GA Crossover operators
│   ├── pre-ga/                # Constraint validation pipeline
│   ├── report/                # HTML Report generation script
│   ├── scripts/               # Diagnostic and test scripts
│   ├── tests/                 # Vitest test suites
│   ├── main.ts                # Legacy CLI entry point for GA
│   └── generated/             # Auto-generated Prisma Client
├── prisma.config.ts           # Prisma configuration
├── tsconfig.json              # Backend TypeScript configuration
├── vitetest.config.ts         # Vitest configuration
└── package.json               # Backend dependencies
```
