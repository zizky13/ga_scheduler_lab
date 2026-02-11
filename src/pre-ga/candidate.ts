export interface PreGACandidate {
    offeringId: number;
    requiredSessions: number;
    roomId: number;
    lecturerIds: number[];
    possibleTimeSlotIds: number[];
}

export interface PreGAOutput {
    feasible: PreGACandidate[];
    infeasible: {
        offeringId: number;
        reason: string;
    }[];
}