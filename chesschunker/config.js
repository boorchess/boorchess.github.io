// --- Configuration ---
export const config = {
    memorizeTimeFactor: 1500, // ms per square to memorize
    recallTimeFactor: 2000, // ms per square to recall
    minMemorizeTime: 5000, // Minimum time (ms) for memorization (5 seconds)
    minRecallTime: 5000, // Minimum time (ms) for recall (5 seconds)
    feedbackDelay: 500, // ms to show feedback (correct/incorrect) before processing result
    nextRoundDelay: 2000, // ms before starting the next round after success/failure
    maxIncorrectAttempts: 3, // Number of *consecutive* incorrect attempts before game over
    chessPieces: { // Unicode chess pieces
        white: {
            pawn: '♙', king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘'
        },
        black: {
            // Note: Using standard black pieces, remove variation selector if causing issues
            pawn: '♟', king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞'
        }
    },
    // --- Configuration for Realistic Pattern Generation ---
    // Weights for piece types. Higher values mean more likely to be chosen.
    pieceWeights: {
        pawn: 8, // Pawns are most common
        knight: 3,
        bishop: 3,
        rook: 4,
        queen: 2,
        king: 1 // Note: Kings are placed separately, this weight doesn't directly affect random selection
    },
    // Probability (0 to 1) of a piece being white vs black in the generated pattern.
    // Note: This affects the *pattern*, not the static side palettes.
    whitePieceProbability: 0.5,
    // --- End Configuration ---
};
