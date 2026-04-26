---

## Database

### `prisma/schema.prisma`

Defines the SQLite database schema. In Prisma 7, the `url` is configured in `prisma.config.ts` rather than in the schema file itself.

#### Models

| Model | Description |
|---|---|
| `Lecturer` | A teaching staff member. Has `isStructural` flag to distinguish administrative/structural lecturers. |
| `ProgramStudy` | An academic programme (e.g. "Informatika"). |
| `Course` | A course belonging to a programme. Has `requiresSpecialRoom` flag and optional facility requirements. |
| `Facility` | A room feature/equipment (e.g. LAB, PROJECTOR). |
| `Room` | A physical room with capacity, type, and a list of facilities. |
| `RoomFacility` | Join table linking `Room` ↔ `Facility`. |
| `CourseFacilityRequirement` | Join table linking `Course` ↔ `Facility` (what the course needs). |
| `TimeSlot` | A schedulable time block with `day`, `startTime`, `endTime`. |
| `CourseOffering` | A semester-specific instance of a course, linked to a room and one or more lecturers. |
| `CourseOfferingLecturer` | Join table linking `CourseOffering` ↔ `Lecturer`. |

---

### `prisma.config.ts`

Prisma 7 configuration file. Specifies the schema path, migrations path, and reads the database connection URL from the `DATABASE_URL` environment variable.

---

### `src/db/client.ts`

Creates and exports the **singleton Prisma Client** instance used across the entire application.

Uses `@prisma/adapter-libsql` with `@libsql/client` to connect to the SQLite database — the required pattern in Prisma 7 where every `PrismaClient` must receive an adapter or an Accelerate URL.

```ts
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
export { prisma };
```

---

### `src/db/seed.ts`

Populates the database with representative test data for development:

- 1 programme (`Informatika`)
- 2 facilities (`LAB`, `PROJECTOR`)
- 2 rooms (Lab Komputer with capacity 40, Ruang Kecil with capacity 20)
- 2 lecturers (`Dr. Andi`, `Prof. Budi`)
- 2 courses (`Algoritma dan Struktur Data`, `Etika Profesi`)
- 3 time slots (Monday/Tuesday)
- 3 course offerings — one *feasible*, one infeasible due to room capacity, one infeasible due to missing LAB facility

Run with: `npm run db:seed`

---

## Pre-GA Pipeline

### `src/pre-ga/candidate.ts`

Defines the data structures that flow between the pre-GA phase and the GA engine.

#### `interface PreGACandidate`

Represents a course offering that has passed all pre-GA checks and is ready to be scheduled by the GA.

| Field | Type | Description |
|---|---|---|
| `offeringId` | `number` | The ID of the `CourseOffering` in the database. |
| `requiredSessions` | `number` | How many time slots must be assigned to this offering. |
| `roomId` | `number` | The ID of the assigned room. |
| `lecturerIds` | `number[]` | IDs of all lecturers teaching this offering. |
| `possibleTimeSlotIds` | `number[]` | All time slots that could potentially be assigned. |

#### `interface PreGAOutput`

The final output of `runPreGA()`.

| Field | Type | Description |
|---|---|---|
| `feasible` | `PreGACandidate[]` | Offerings that passed all checks, ready for the GA. |
| `infeasible` | `{ offeringId, reason }[]` | Offerings that failed at least one check, with a human-readable reason. |

---

### `src/pre-ga/result.ts`

Lightweight types used internally by individual checks.

#### `type PreGAStatus`
`"FEASIBLE"` | `"INFEASIBLE"`

#### `interface PreGAResult`

| Field | Type | Description |
|---|---|---|
| `offeringId` | `number` | The offering being evaluated. |
| `status` | `PreGAStatus` | Whether the offering passed or failed. |
| `reason` | `string?` | Optional failure message. |

---

### `src/pre-ga/validator.ts`

#### `async function runPreGA(): Promise<PreGAOutput>`

Orchestrates the entire pre-GA pipeline. Fetches all `CourseOffering` records from the database (with their related `Course`, `Room`, and `Lecturer` data), then runs each offering through the following six checks in order. If any check fails, the offering is placed in `infeasible` and the remaining checks are skipped for that offering.

| Step | Check | Fail Code |
|---|---|---|
| 1 | Data Integrity | `INTEGRITY_FAIL` |
| 2 | Room Capacity (UPJ) | `ROOM_FAIL` |
| 3 | Temporal Sufficiency | `TEMPORAL_FAIL` |
| 4 | Facility Compatibility | `FACILITY_FAIL` |
| 5 | Lecturer Availability | `LECTURER_FAIL` |
| 6 | Academic Policy | `POLICY_FAIL` |

Offerings that pass all six checks are converted into `PreGACandidate` objects (with all available time slots set as `possibleTimeSlotIds`) and placed in `feasible`.

---

### `src/pre-ga/checks/integrity.ts`

#### `function checkDataIntegrity(offering): IntegrityCheckResult`

Validates basic data completeness of an offering:

- Course must exist
- `effectiveStudentCount` must be > 0
- `totalSessions` must be > 0
- At least one lecturer must be assigned

Returns `{ ok: true }` or `{ ok: false, reason: "INTEGRITY_FAIL: ..." }`.

---

### `src/pre-ga/checks/room.ts`

#### `function checkRoomCapacityUPJ(offering): RoomCheckResult`

Validates room assignment and calculates the number of sessions required using UPJ's parallel-class rule:

$$\text{requiredSessions} = \lceil \text{effectiveStudentCount} / \text{roomCapacity} \rceil$$

Returns `{ ok: true, requiredSessions }` or `{ ok: false, reason: "ROOM_FAIL: ..." }`.

---

### `src/pre-ga/checks/temporal.ts`

#### `function checkTemporalSufficiency(offering, requiredSessions): TemporalCheckResult`

Compares `offering.totalSessions` (the number of time slots declared in the offering) against `requiredSessions` (calculated from room capacity). The offering must have enough declared sessions to split across parallel rooms.

Returns `{ ok: true }` or `{ ok: false, reason: "TEMPORAL_FAIL: ..." }`.

---

### `src/pre-ga/checks/facility.ts`

#### `function checkFacilityCompatibility(offering): FacilityCheckResult`

Checks that the assigned room provides every facility required by the course. If a course requires a LAB but the room doesn't have a LAB facility, the offering fails.

- If no room is assigned → passes (the GA will handle room assignment later)
- If the course has no facility requirements → passes

Returns `{ ok: true }` or `{ ok: false, reason: "FACILITY_FAIL: ..." }`.

---

### `src/pre-ga/checks/lecturer.ts`

#### `function checkLecturerAvailability(offering): LecturerCheckResult`

Validates lecturer constraints:

- At least one lecturer must be assigned
- For structural lecturers: `offering.totalSessions` must not exceed `MAX_SESSIONS_STRUCTURAL` (8)

Returns `{ ok: true }` or `{ ok: false, reason: "LECTURER_FAIL: ..." }`.

---

### `src/pre-ga/checks/policy.ts`

#### `function checkAcademicPolicy(offering, requiredSessions): PolicyCheckResult`

Enforces UPJ academic rules:

1. **Non-parallel (fixed) classes** must have a room assigned and must have sufficient sessions.
2. **Parallel classes** must have a room assigned.
3. All offerings must have a valid `academicYear` and `semester`.

Returns `{ ok: true }` or `{ ok: false, reason: "POLICY_FAIL: ..." }`.

---

## Genetic Algorithm Engine

### `src/ga/chromosome.ts`

Defines the fundamental GA data structures.

#### `interface Gene`

Represents the scheduled assignment for one course offering.

| Field | Type | Description |
|---|---|---|
| `offeringId` | `number` | References the `PreGACandidate` this gene belongs to. |
| `assignedTimeSlotIds` | `number[]` | The time slots randomly assigned to this offering. Length equals `requiredSessions`. |

#### `type Chromosome`

`Gene[]` — a complete candidate timetable, one gene per offering.

#### `function createRandomChromosome(candidates: PreGACandidate[]): Chromosome`

Builds a new random chromosome. For each candidate, it shuffles the `possibleTimeSlotIds` and takes the first `requiredSessions` slots as the initial assignment.

---

### `src/ga/population.ts`

#### `function generateInitialPopulation(candidates, populationSize): Chromosome[]`

Creates the initial population by calling `createRandomChromosome()` `populationSize` times. Each chromosome is independently randomised.

---

### `src/ga/fitness.ts`

Evaluates how good a chromosome (schedule) is.

#### `function evaluateFitness(chromosome, candidates, lecturerStructuralMap): FullFitnessResult`

The top-level fitness function. Combines hard violations and a weighted soft penalty:

$$\text{fitness} = \frac{1}{1 + \text{hardViolations} + \alpha \times \text{softPenalty}}$$

where $\alpha = 0.2$. A fitness of `1.0` is a perfect schedule.

#### `function evaluateHardFitness(chromosome, candidates): FitnessResult`

Counts **hard constraint violations**:

- **Room-time conflict**: two offerings assigned to the same room at the same time slot → +1 violation per duplicate
- **Lecturer-time conflict**: the same lecturer assigned to two offerings at the same time slot → +1 violation per duplicate

Uses composite keys (`"roomId-timeSlotId"` and `"lecturerId-timeSlotId"`) to detect collisions efficiently.

$$\text{hardFitness} = \frac{1}{1 + \text{hardViolations}}$$

#### `function calculateStructuralPenalty(chromosome, candidates, lecturerStructuralMap): number`

Counts the **soft penalty** for structural lecturers. Structural lecturers have a preferred maximum session load of 2. For each structural lecturer, excess sessions are counted:

$$\text{penalty} += \max(0,\ \text{sessions} - 2) \quad \forall \text{ structural lecturer}$$

#### `interface FitnessResult`

| Field | Type | Description |
|---|---|---|
| `fitness` | `number` | Normalised fitness score `(0, 1]`. |
| `hardViolations` | `number` | Total number of hard constraint violations. |

#### `interface FullFitnessResult`

Extends `FitnessResult` with:

| Field | Type | Description |
|---|---|---|
| `softPenalty` | `number` | Total soft penalty from overloaded structural lecturers. |

---

### `src/ga/selection.ts`

#### `function tournamentSelection(population, candidates, tournamentSize): Chromosome`

Implements **tournament selection**. Randomly picks `tournamentSize` chromosomes from the population and returns the one with the highest hard fitness. This creates selection pressure without fully sorting the entire population.

---

### `src/ga/mutation.ts`

#### `function mutateChromosome(chromosome, candidates, mutationRate): Chromosome`

Applies **random resetting mutation**. Iterates over each gene; with probability `mutationRate`, it replaces the gene's `assignedTimeSlotIds` with a fresh random selection from `possibleTimeSlotIds`. This prevents premature convergence.

---

### `src/ga/types.ts`

#### `type CrossoverOperator`

```ts
(parent1: Chromosome, parent2: Chromosome) => [Chromosome, Chromosome]
```

A function type that describes the interface any crossover operator must satisfy. Both crossover implementations (`singlePointCrossover`, `uniformCrossover`) conform to this type.

---

### `src/ga/repair.ts`

#### `function repairChromosome(chromosome, candidates): Chromosome`

Applies **conflict-aware repair** to a chromosome immediately after it is produced by crossover and mutation. The goal is to resolve as many hard constraint violations (room-time and lecturer-time collisions) as possible before the chromosome enters the fitness evaluation step, accelerating convergence to zero hard violations.

The algorithm runs in four stages:

**Stage 1 — Build conflict index (single pass, O(n·s))**

Iterates over all genes in the chromosome and builds two usage maps:

- `roomTimeUsage: Map<"roomId-timeSlotId", Set<geneIndex>>` — which genes occupy each room×slot pair
- `lecturerTimeUsage: Map<"lecturerId-timeSlotId", Set<geneIndex>>` — which genes occupy each lecturer×slot pair

Any set with more than one element indicates a hard conflict.

**Stage 2 — Score each gene's conflict severity**

For each gene, counts its total collision count across all assigned slots, in both maps. Only genes with `score > 0` are added to the repair queue.

**Stage 3 — Sort genes by conflict score (descending)**

Genes with the highest conflict counts are repaired first. This greedy prioritisation ensures that freeing the most-contested slots early creates the most room for subsequent genes to find conflict-free alternatives.

**Stage 4 — Repair loop**

For each conflicted gene:

1. Re-check its score against the *current* conflict index (earlier repairs may have already resolved it).
2. For each assigned slot that is still conflicting, call `findBestSlot()` to find a replacement from `possibleTimeSlotIds` that minimises remaining collisions.
3. Update the conflict index immediately after each slot replacement so subsequent genes see an accurate picture.

| Edge case | Strategy |
|---|---|
| No alternative slot available | Keep the slot with the fewest remaining conflicts (least-bad strategy); chromosome structure is preserved |
| Gene already resolved by a prior repair | Skipped (score re-check prevents unnecessary work) |
| Gene has unknown `offeringId` | Silently skipped; gene is left unchanged |
| Multi-session gene — no duplicate slots | When searching for alternatives, already-assigned slots for other sessions of the same gene are excluded |
| Empty chromosome or empty candidates | Returns the input unchanged without error |

Returns a **new chromosome** array; the original is never mutated.

#### Integration point in `runGA.ts`

```ts
// 1. Applied to the entire initial population:
let population = generateInitialPopulation(candidates, config.populationSize)
    .map(ch => repairChromosome(ch, candidates));

// 2. Applied to every offspring after crossover + mutation:
const repaired1 = repairChromosome(mutated1, candidates);
const repaired2 = repairChromosome(mutated2, candidates);
```

---

### `src/ga/runGA.ts`

#### `interface GAConfig`

The full configuration object for a GA run.

| Field | Type | Description |
|---|---|---|
| `populationSize` | `number` | Number of chromosomes per generation. |
| `generations` | `number` | How many generations to evolve. |
| `tournamentSize` | `number` | Number of contestants in each tournament selection. |
| `mutationRate` | `number` | Probability `[0,1]` that a gene mutates. |
| `elitisimCount` | `number` | Number of best chromosomes carried over unchanged each generation. |
| `crossover` | `CrossoverOperator` | The crossover function to use. |

#### `function runGA(candidates, config): number[]`

The **main GA loop**. Runs for `config.generations` generations and returns the best fitness value per generation as a history array for analysis.

Each generation:

1. **Evaluate** — score every chromosome with `evaluateFitness()`
2. **Sort** — rank by fitness descending
3. **Log** — print best fitness, average fitness, hard violations, and soft penalty
4. **Elitism** — copy the top `elitisimCount` chromosomes directly to the next generation
5. **Reproduce** — fill the rest of the new population via tournament selection → crossover → mutation
6. **Repeat**

`lecturerStructuralMap` is currently hardcoded (`{ 1: true, 2: true, 3: false, 4: true }`) as a placeholder for the database-driven version.

---

### `src/ga/experiment.ts`

#### `function runOneGeneration(candidates, crossover, populationSize?): number`

A lightweight helper for single-generation experiments. Generates a population, produces one generation of offspring via crossover, evaluates the hard fitness of all offspring, and returns the best fitness value. Useful for quickly benchmarking different crossover strategies without running a full multi-generation loop.

---

### `src/ga/stressTest.ts`

#### `function stressTest(): PreGACandidate[]`

Generates 8 synthetic `PreGACandidate` objects without touching the database. Used to stress-test the GA engine with controlled, reproducible inputs. Candidates are distributed across 2 rooms, 2 lecturers, and 4 time slots; every third candidate requires 2 sessions instead of 1.

---

## Crossover Operators

### `src/crossovers/singlePoint.ts`

#### `function singlePointCrossover(parent1, parent2): [Chromosome, Chromosome]`

Classic **single-point crossover**. Picks a random cut point in `[1, length-1]`, then splices the parents:

```
parent1: [A B C | D E F]
parent2: [a b c | d e f]
                ^
child1:  [A B C | d e f]
child2:  [a b c | D E F]
```

Both parents must have the same length, otherwise an error is thrown.

---

### `src/crossovers/uniform.ts`

#### `function uniformCrossover(parent1, parent2): [Chromosome, Chromosome]`

**Uniform crossover**. For each gene position, a coin flip (50%) determines whether child1 or child2 inherits from parent1 or parent2. This results in more diversity than single-point crossover since any subset of genes can be combined.

```
parent1: [A B C D E F]
parent2: [a b c d e f]
flip:    [H T T H T H]   (H=heads, T=tails)
child1:  [A b c D e F]
child2:  [a B C d E f]
```

---

## Tests

Tests are written with **Vitest** and live in `src/tests/pre-ga/`.

### `src/tests/pre-ga/integrity.test.ts`
Tests `checkDataIntegrity`: verifies it fails when no lecturers are assigned and passes when minimum valid data is present.

### `src/tests/pre-ga/room.test.ts`
Tests `checkRoomCapacityUPJ`: verifies correct `requiredSessions` calculation (e.g. 60 students / 45 capacity = 2 sessions) and fails when room is `null`.

### `src/tests/pre-ga/temporal.test.ts`
Tests `checkTemporalSufficiency`: verifies the offering fails when available sessions are fewer than required.

### `src/tests/pre-ga/facility.test.ts`
Tests `checkFacilityCompatibility`: verifies failure when the room is missing a required facility.

### `src/tests/pre-ga/lecturer.test.ts`
Tests `checkLecturerAvailability`: verifies failure for empty lecturer list and hard cap enforcement for structural lecturers.

### `src/tests/pre-ga/academic.test.ts`
Tests `checkAcademicPolicy`: verifies that non-parallel classes without a room are rejected, and that missing academic year/semester fails validation.

### `src/tests/pre-ga/pre_ga/validator.test.ts`
Integration tests for the full `runPreGA()` pipeline against the test database.

### `src/tests/ga/repair.test.ts`

Unit tests for `repairChromosome`, organised into seven suites:

| Suite | Scenario |
|---|---|
| Room-time conflict | Two genes sharing the same room×slot → repaired to 0 violations |
| Room-time conflict (3 genes) | Three genes in the same room×slot → all spread across distinct slots |
| Lecturer-time conflict | Same lecturer in two different rooms at same slot → repaired |
| Multi-session genes | Partial conflict on a 2-session gene → resolved; no duplicate slots within a gene |
| Conflict-free no-op | Already-valid chromosome returns the same assignments unchanged |
| Edge — no alternative slot | Unresolvable conflict (only one possible slot) → no throw, structure intact |
| Edge — unknown offeringId | Orphan gene silently skipped; rest of chromosome repaired normally |
| Edge — empty inputs | Empty chromosome and empty candidates array → returned unchanged |

---

