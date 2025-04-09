import { config } from './config.js';
import {
    isValidPlacement,
    isWhite, isBlack, isPawn, isBishop, isKing,
    whiteKing, blackKing // Import specific pieces needed
} from './validation.js';

let weightedPieces = []; // Stores pieces based on config weights (excluding kings initially)

function setupWeightedPieces() {
    weightedPieces = []; // Reset for potential re-calculation if config changes
    for (const color in config.chessPieces) {
        for (const pieceType in config.pieceWeights) {
            // Skip kings here, they are placed deterministically
            if (pieceType === 'king') continue;

            const weight = config.pieceWeights[pieceType] || 1;
            const piece = config.chessPieces[color][pieceType];
            if (piece) {
                for (let i = 0; i < weight; i++) {
                    weightedPieces.push(piece);
                }
            } else {
                console.warn(`Piece definition not found for ${color} ${pieceType} in config.chessPieces`);
            }
        }
    }

    if (weightedPieces.length === 0) {
        console.warn("Weighted piece list generation failed (excluding kings), using fallback.");
        // Fallback: Use all defined pieces (except kings) equally
        const allPieces = [];
        for (const color in config.chessPieces) {
            for (const pieceType in config.chessPieces[color]) {
                if (pieceType !== 'king') {
                    allPieces.push(config.chessPieces[color][pieceType]);
                }
            }
        }
        weightedPieces = allPieces;

        if (weightedPieces.length === 0) {
             console.error("FATAL: Could not generate any weighted pieces list, even with fallback. Check config.chessPieces and config.pieceWeights.");
             // This situation should be highly unusual if config is valid.
        } else {
            console.log("Using fallback weighted pieces:", weightedPieces);
        }
    } else {
        // console.log("Generated weighted pieces (excluding kings):", weightedPieces); // Optional: Log the list
    }
}

function getRandomWeightedPiece() {
    if (weightedPieces.length === 0) {
        setupWeightedPieces(); // Ensure setup if called early
        if (weightedPieces.length === 0) return '?'; // Fallback if still empty after setup attempt
    }
    return weightedPieces[Math.floor(Math.random() * weightedPieces.length)];
}

export function generatePattern(gridSize, numPieces) {
    console.log(`Generating pattern: Grid ${gridSize}x${gridSize}, Target Pieces: ${numPieces}`);
    if (numPieces < 2) {
        console.warn("Cannot generate pattern: Need at least 2 pieces for two kings. Forcing minimum.");
        numPieces = 2; // Force minimum for kings
    }
    const maxPossiblePieces = gridSize * gridSize;
    if (numPieces > maxPossiblePieces) {
        console.warn(`Cannot generate pattern: Number of pieces (${numPieces}) exceeds grid size (${maxPossiblePieces}). Clamping.`);
        numPieces = maxPossiblePieces;
    }

    setupWeightedPieces(); // Ensure weighted list (without kings) is ready

    let pattern = [];
    const occupiedIndices = new Set();
    const totalCells = gridSize * gridSize;
    let remainingPiecesToPlace = numPieces;
    // --- Increased max attempts ---
    const maxPlacementAttemptsPerPiece = 200; // Increased attempts per piece before giving up
    const kingMaxAttempts = maxPlacementAttemptsPerPiece * 2; // Also increase king attempts proportionally
    let generationSuccess = true; // Flag to track if generation completed successfully


    // --- Force Placement of Kings ---
    // Uses isValidPlacement from validation.js which includes check detection
    const kingsToPlace = [whiteKing, blackKing];
    for (const king of kingsToPlace) {
        if (occupiedIndices.size >= totalCells) {
             console.error(`FATAL: No empty squares left to place ${king}. Aborting.`);
             generationSuccess = false;
             break;
        }
        let placed = false;
        let attempts = 0;

        // --- Random placement attempt ---
        while (!placed && attempts < kingMaxAttempts) {
            const randomIndex = Math.floor(Math.random() * totalCells);
            // Check occupancy AND validity using the imported function
            if (!occupiedIndices.has(randomIndex)) {
                 // console.log(`Attempting to place ${king} at ${randomIndex}...`); // Debug log
                 if (isValidPlacement(randomIndex, king, gridSize, occupiedIndices, pattern)) {
                    occupiedIndices.add(randomIndex);
                    pattern.push({ index: randomIndex, piece: king });
                    remainingPiecesToPlace--;
                    placed = true;
                    // console.log(`Successfully placed ${king} at ${randomIndex} via random.`); // Debug log
                }
                 // else { console.log(` > Invalid placement for ${king} at ${randomIndex}. Reason: [See validation logs]`); } // More specific debug
            }
            attempts++;
        }

        // --- Sequential fallback placement attempt ---
        if (!placed) {
            console.warn(`Could not place ${king} randomly after ${attempts} attempts, trying sequential scan.`);
            let foundFallback = false;
            for (let i = 0; i < totalCells; i++) {
                if (!occupiedIndices.has(i)) {
                    // console.log(`Fallback: Attempting to place ${king} at ${i}...`); // Debug log
                    if (isValidPlacement(i, king, gridSize, occupiedIndices, pattern)) {
                        occupiedIndices.add(i);
                        pattern.push({ index: i, piece: king });
                        remainingPiecesToPlace--;
                        foundFallback = true;
                        placed = true; // Mark as placed
                         console.log(`Successfully placed ${king} at ${i} via fallback.`); // Debug log
                        break;
                    }
                    // else { console.log(` > Fallback Invalid placement for ${king} at ${i}. Reason: [See validation logs]`); } // More specific debug
                }
            }
             if (!foundFallback) {
                 console.error(`FATAL: Could not place ${king} even with fallback (Grid ${gridSize}x${gridSize}, TargetPieces ${numPieces}, CurrentPattern: ${JSON.stringify(pattern)}). Aborting pattern generation.`);
                 generationSuccess = false; // Mark generation as failed
                 break; // Exit the king placement loop
            }
        }
    }

    // --- Place Remaining Random Pieces (only if kings were placed successfully) ---
    if (generationSuccess) {
        let skippedPieceCount = 0; // Track how many pieces were skipped
        // Allow skipping more pieces, especially on smaller/denser boards
        const maxSkippedPieces = Math.max(1, Math.floor(numPieces * 0.3)); // Allow skipping up to 30% of pieces (min 1)

        while (remainingPiecesToPlace > 0 && occupiedIndices.size < totalCells) {
             if (skippedPieceCount >= maxSkippedPieces) {
                console.warn(`Skipped ${skippedPieceCount} pieces (max allowed: ${maxSkippedPieces}) due to placement constraints. Stopping piece addition.`);
                break; // Stop trying to add more pieces if too many failed
             }

            if (weightedPieces.length === 0) {
                console.error("Cannot place remaining pieces: Weighted piece list is empty.");
                generationSuccess = false; // Mark as failure if source is empty
                break;
            }
            const piece = getRandomWeightedPiece(); // Get random piece (non-king)
            let placed = false;
            let attempts = 0;

            // --- Random placement attempt ---
            while (!placed && attempts < maxPlacementAttemptsPerPiece) {
                const randomIndex = Math.floor(Math.random() * totalCells);
                if (!occupiedIndices.has(randomIndex)) {
                    // Add logging to see which piece is being attempted and where
                    // console.log(`Attempting random placement: ${piece} at ${randomIndex}`);
                    if (isValidPlacement(randomIndex, piece, gridSize, occupiedIndices, pattern)) {
                        occupiedIndices.add(randomIndex);
                        pattern.push({ index: randomIndex, piece: piece });
                        remainingPiecesToPlace--;
                        placed = true;
                        // console.log(` > Success`);
                    }
                    // else { console.log(` > Invalid (random)`); }
                }
                attempts++;
            }

            // --- Sequential fallback placement attempt ---
            if (!placed) {
                // console.log(`Random placement failed for ${piece} after ${attempts} attempts. Trying sequential.`);
                let foundFallback = false;
                for (let i = 0; i < totalCells; i++) {
                    if (!occupiedIndices.has(i)) {
                        // console.log(`Attempting fallback placement: ${piece} at ${i}`);
                        if (isValidPlacement(i, piece, gridSize, occupiedIndices, pattern)) {
                            occupiedIndices.add(i);
                            pattern.push({ index: i, piece: piece });
                            remainingPiecesToPlace--;
                            foundFallback = true;
                            placed = true; // Mark as placed
                            // console.log(` > Success (fallback)`);
                            break;
                        }
                        // else { console.log(` > Invalid (fallback)`); }
                    }
                }
                 if (!foundFallback) {
                    console.warn(`Could not place piece ${piece} (Target ${numPieces}, Grid ${gridSize}x${gridSize}) after ${maxPlacementAttemptsPerPiece} random + fallback attempts. Skipping this piece.`);
                    // Skip the piece to avoid potential infinite loops if rules are too strict.
                    // Don't decrement remainingPiecesToPlace here, as we never placed it. Instead, track skips.
                    skippedPieceCount++;
                    // We continue the loop to try placing the *next* intended piece.
                }
            }
        } // end while remainingPiecesToPlace

        // --- ADJUSTED SUCCESS CHECK ---
        // Generation is considered successful if kings were placed.
        // We no longer fail just because we couldn't place all requested *other* pieces.
        const finalPieceCount = pattern.length;
        // const requiredPieceCount = numPieces - maxSkippedPieces; // Previous logic
        /*
        if (finalPieceCount < requiredPieceCount && occupiedIndices.size < totalCells) {
             console.error(`Generation ended with only ${finalPieceCount} pieces (required >= ${requiredPieceCount}) and space available. Marking as failure.`);
             generationSuccess = false;
        } else */
        if (finalPieceCount < numPieces) { // Keep warning if target wasn't met
            console.warn(`Generation ended with ${finalPieceCount} pieces (target ${numPieces}) due to placement constraints or space limit. Proceeding with available pieces.`);
            // This is NOT a hard failure anymore.
        }

    } // end if generationSuccess (king placement check)


    // If generation failed (e.g., couldn't place a king), return an empty pattern.
    if (!generationSuccess) {
        console.error("Pattern generation FAILED (likely couldn't place a king). Returning empty pattern.");
        return []; // Indicate failure
    }

    // Final sort for consistency before returning
    pattern.sort((a, b) => a.index - b.index);
    console.log(`Generated Pattern (Actual Pieces: ${pattern.length} on ${gridSize}x${gridSize}):`, JSON.stringify(pattern.map(p => ({ i: p.index, p: p.piece })))); // More compact log
    return pattern;
}
