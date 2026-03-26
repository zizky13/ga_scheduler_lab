# UI/UX Design Brief  
## Genetic Algorithm-Based Course Scheduling System

---

## 1. Product Goal

The system aims to transform the course scheduling process from a fully manual, spreadsheet-based workflow into a **semi-automated, decision-support system**.

Instead of generating a perfect schedule (which may be infeasible), the system should:

- Generate a **near-optimal initial schedule**
- Clearly **identify and explain conflicts**
- Provide **actionable recommendations**
- Enable users to **resolve conflicts efficiently with minimal effort**

---

## 2. Target Users

### Primary Users:
- Head of Study Program (Kaprodi)
- Academic administrators

### User Characteristics:
- Familiar with spreadsheet tools (e.g., Excel)
- Partially Non-technical background
- Require high control over scheduling decisions
- Need accuracy and clarity (low tolerance for scheduling errors)

---

## 3. Design Principles

### 3.1 Transparency Over Automation
The system must always explain:
- Why conflicts occur
- Why a suggestion is recommended

---

### 3.2 Minimize Cognitive Load
Users should:
- Avoid manual validation
- Avoid complex reasoning
- Be able to act quickly through guided UI

---

### 3.3 Progressive Refinement
Workflow should support:
- Initial solution → iterative improvement → final schedule

---

### 3.4 User Control First
- Users must be able to override system decisions
- Locking mechanisms must be respected by optimization

---

### 3.5 Familiar Interaction Model
- UI should resemble spreadsheet/table layouts
- Reduce learning curve

---

### 3.6 Design Library
- Use ant design library for UI components
- Use motion library for animation


## 4. Core Layout Structure
-----------------------------------------------------
| Header (Semester, Program, Actions)               |
-----------------------------------------------------
| Summary Panel                                    |
| - Hard Violations                                |
| - Soft Violations                                |
| - Status                                         |
-----------------------------------------------------
| Main Content                                     |
| [Schedule Grid] | [Conflict Panel]               |
-----------------------------------------------------

## 5. Key UI Components

### 5.1 Schedule Grid (Primary Interface)

Structure:
	•	Table layout (Days × Time Slots)
	•	Each cell represents a scheduled class

Cell Content:
	•	Course name
	•	Lecturer(s)
	•	Room

Visual States:
	•	🟩 Green → No conflict
	•	🟨 Yellow → Soft constraint violation
	•	🟥 Red → Hard constraint violation

Interaction:
	•	Click → open edit panel
	•	Hover → show details
	•	Optional: drag & drop (advanced)

### 5.2 Summary Panel

---

- Displayed at top:
    •	Hard Violations: 3
	•	Soft Violations: 5
	• Status: ⚠️ Needs Adjustment

- Status States:
	•	✅ Feasible (Hard = 0)
	•	⚠️ Near-feasible (Hard > 0 but low)
	•	❌ Invalid (High conflicts)

---

### 5.3 Conflict Panel
- Displays all detected conflicts.

- Example:
    [1] Course A vs Course B
        - Room conflict
        - Monday 09:00

    [2] Lecturer X
        - Double booking
        - Tuesday 10:00
- Features:
	•	Click → highlight related cells in grid
	•	Sorted by severity
	•	Expandable details

---

### 5.4 Conflict Detail & Suggestion Panel
- When a conflict is selected:
Conflict: Lecturer X double-booked

Suggestions:
[✔] Tuesday 13:00 → No conflict
[⚠] Wednesday 10:00 → +1 soft violation
[✖] Thursday 08:00 → Room unavailable

Interaction:
	•	Click suggestion → apply instantly
	•	System updates in real-time

---

### 5.5 Quick Actions (Header)
	•	Generate Schedule
	•	Optimize Again
	•	Auto-Fix Conflicts
	•	Reset Schedule
	•	Export (Excel / PDF)

---

### 5.6 Lock Mechanism
- Users can lock specific entries:
    [🔒 Lock this schedule entry]
- Behavior:
	•	Locked entries cannot be modified by:
	•	GA optimization
	•	Auto-repair
	•	Suggestions

---

### 5.7 Inline Editing
Users can manually edit:
	•	Click cell → dropdown time slot selection
	•	Optional: change room (if allowed)

Feedback:
	•	Real-time update of:
	•	Hard violations
	•	Soft violations

---
### 5.8 Login Page
User can login to have acces depending on their role.

## 6. Interaction Flow

### Step 1: Login
User login to the system.

---

### Step 2: Data Input

User inputs:
	•	Courses
	•	Lecturers
	•	Rooms
	•	Constraints

---

### Step 3: Generate Initial Schedule
User clicks:
[Generate schedule]
System:
	•	Runs GA
	•	Produces best candidate

---

### Step 4: Initial Output Display

System shows:
	•	Schedule grid
	•	Conflict summary
	•	Status indicator

---

### Step 5: Conflict Exploration

User:
	•	Opens Conflict Panel
	•	Clicks conflict

System:
	•	Highlights relevant schedule entries
	•	Shows explanation

---

### Step 6: Conflict Resolution

User can:
	•	Apply suggested fixes
	•	Edit manually
	•	Lock certain entries

---

### Step 7: Iterative Optimization

User clicks:
[Optimize again]

System:
	•	Runs GA from current state
	•	Respects locked entries

---

### Step 8: Finalization

User:
	•	Reviews final schedule
	•	Exports result

---

## 7. System Feedback Requirements

Every action must trigger:
	•	Immediate UI update
	•	Conflict recalculation
	•	Visual feedback (color/state changes)

## 8. Error Handling & Edge Cases

### 8.1 Infeasible Scheduling
    If no zero-conflict solution exists:
        ⚠️ No conflict-free schedule possible
        Minimum achievable conflicts: 3
### 8.2 Invalid Data
    Examples:
	•	Missing lecturer
	•	No available room

    System should:
	•	Block generation
	•	Show clear error messages
### 8.3 Invalid user
    If user is not authorized to access the system:
        ⚠️ User is not authorized to access the system
        Please login with your credentials
        

## 9. Key Success Metrics
The system should be evaluated based on:
	•	Reduction in scheduling time
	•	Reduction in manual adjustments
	•	Number of conflicts in initial schedule
	•	User satisfaction (ease of use)
	•	Reduction in cognitive load

## 10. Positioning Statement

This system is not designed to fully replace human decision-making, but to:

Significantly reduce the complexity of scheduling by automating conflict detection, providing intelligent recommendations, and enabling rapid refinement of schedules.
