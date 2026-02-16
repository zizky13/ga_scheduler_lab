import type { PreGACandidate } from "../pre-ga/candidate.js";

export function stressTest(): PreGACandidate[] {
    let id = 1;
    const rooms = [1,2];
    const lecturers = [1,2];
    const timeSlots = [1,2,3,4];
    const candidates: PreGACandidate[] = [];


    for(let i = 0; i < 8; i++) {
        candidates.push({
            offeringId: id++,
            requiredSessions: i % 3 === 0 ? 2 : 1,
            roomId: rooms[i % 2]!,
            lecturerIds: [lecturers[i % 2]!],
            possibleTimeSlotIds: timeSlots,
        })
    }
    return candidates;
}