import { config } from './config.js';

// --- Piece Type/Color Identification ---
const whiteKing = config.chessPieces.white.king;
const blackKing = config.chessPieces.black.king;
const whitePawn = config.chessPieces.white.pawn;
const blackPawn = config.chessPieces.black.pawn;
const whiteKnight = config.chessPieces.white.knight;
const blackKnight = config.chessPieces.black.knight;
const whiteBishop = config.chessPieces.white.bishop;
const blackBishop = config.chessPieces.black.bishop;
const whiteRook = config.chessPieces.white.rook;
const blackRook = config.chessPieces.black.rook;
const whiteQueen = config.chessPieces.white.queen;
const blackQueen = config.chessPieces.black.queen;

// --- EXPORT the king constants ---
export { whiteKing, blackKing };

const whitePiecesSet = new Set(Object.values(config.chessPieces.white));
const blackPiecesSet = new Set(Object.values(config.chessPieces.black));

export function getPieceColor(piece) {
    if (whitePiecesSet.has(piece)) return 'white';
    if (blackPiecesSet.has(piece)) return 'black';
    return null;
}

export function isWhite(piece) {
    return whitePiecesSet.has(piece);
}

export function isBlack(piece) {
    return blackPiecesSet.has(piece);
}

export function isPawn(piece) {
    return piece === whitePawn || piece === blackPawn;
}

export function isKnight(piece) {
    return piece === whiteKnight || piece === blackKnight;
}

export function isBishop(piece) {
    return piece === whiteBishop || piece === blackBishop;
}

export function isRook(piece) {
    return piece === whiteRook || piece === blackRook;
}

export function isQueen(piece) {
    return piece === whiteQueen || piece === blackQueen;
}

export function isKing(piece) {
    return piece === whiteKing || piece === blackKing;
}

// --- Check Detection ---

// Checks if a square 'targetIndex' is attacked by of by 'attackingColor'
// based on the current board state 'pattern'.
export function isSquareAttacked(targetIndex, attackingColor, gridSize, pattern) {
    const targetRow = Math.floor(targetIndex / gridSize);
    const targetCol = targetIndex % gridSize;

    // Create a map for quick piece lookup by index
    const pieceMap = new Map();
    pattern.forEach(item => pieceMap.set(item.index, item.piece));

    // Check for attacks from each type
    for (const item of pattern) {
        const piece = item.piece;
        const pieceIndex = item.index;
        const pieceColor = getPieceColor(piece);

        // Only consider pieces of the attacking color
        if (pieceColor !== attackingColor) continue;

        const pieceRow = Math.floor(pieceIndex / gridSize);
        const pieceCol = pieceIndex % gridSize;

        // --- Pawn Attacks ---
        if (isPawn(piece)) {
            const direction = isWhite(piece) ? -1 : 1; // White moves up (-1), Black moves down (+1)
            if (pieceRow + direction === targetRow) {
                if (pieceCol - 1 === targetCol || pieceCol + 1 === targetCol) {
                    // console.log(`Debug: Square ${targetIndex} attacked by Pawn ${piece} at ${pieceIndex}`);
                    return true; // Pawn attack
                }
            }
        }
        // --- Knight Attacks ---
        else if (isKnight(piece)) {
            const knightMoves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            for (const [dr, dc] of knightMoves) {
                if (pieceRow + dr === targetRow && pieceCol + dc === targetCol) {
                    // console.log(`Debug: Square ${targetIndex} attacked by Knight ${piece} at ${pieceIndex}`);
                    return true; // Knight attack
                }
            }
        }
        // --- Sliding Piece Attacks (Bishop, Rook, Queen) ---
        else if (isBishop(piece) || isRook(piece) || isQueen(piece)) {
            const directions = [];
            if (isBishop(piece) || isQueen(piece)) {
                directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]); // Diagonal
            }
            if (isRook(piece) || isQueen(piece)) {
                directions.push([-1, 0], [1, 0], [0, -1], [0, 1]); // Orthogonal
            }

            for (const [dr, dc] of directions) {
                let r = pieceRow + dr;
                let c = pieceCol + dc;
                while (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                    const currentIndex = r * gridSize + c;
                    if (currentIndex === targetIndex) {
                         // console.log(`Debug: Square ${targetIndex} attacked by Sliding ${piece} at ${pieceIndex}`);
                        return true; // Sliding piece attack
                    }
                    // If we hit *any* piece (friendly or foe), the path is blocked
                    if (pieceMap.has(currentIndex)) {
                        break;
                    }
                    r += dr;
                    c += dc;
                }
            }
        }
        // --- King Attacks (for adjacent squares) ---
        else if (isKing(piece)) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    if (pieceRow + dr === targetRow && pieceCol + dc === targetCol) {
                         // console.log(`Debug: Square ${targetIndex} attacked by King ${piece} at ${pieceIndex}`);
                        return true; // King attack (for check detection, not just proximity)
                    }
                }
            }
        }
    }

    return false; // Square is not attacked
}


// --- Placement Validation ---

// Checks if placing 'piece' at 'index' on a 'gridSize' grid is valid according to rules
// 'occupiedIndices' is a Set of already taken indices
// 'currentPattern' is an array of { index: number, piece: string } for already placed pieces
export function isValidPlacement(index, piece, gridSize, occupiedIndices, currentPattern) {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const squareColor = (row + col) % 2 === 0 ? 'light' : 'dark'; // 0: light, 1: dark

    // 1. Is the square already occupied? (Handled by caller checking occupiedIndices)
    // if (occupiedIndices.has(index)) return false; // Already checked by caller, redundant

    // 2. Pawn Placement Rule: No pawns on the first (rank 1) or last (rank 8) rank.
    if (isPawn(piece)) {
        // Rank 8 (top row, index 0)
        if (row === 0) {
            // console.log(`Validation Fail: Pawn ${piece} at [${row},${col}] (${index}) on rank 8 (row 0).`);
            return false; // No pawns allowed on rank 8
        }
        // Rank 1 (bottom row, index gridSize - 1)
        if (row === gridSize - 1) {
            // console.log(`Validation Fail: Pawn ${piece} at [${row},${col}] (${index}) on rank 1 (row ${gridSize - 1}).`);
            return false; // No pawns allowed on rank 1
        }
    }

    // 3. King Adjacency Rule & Cannot Place into Check
    if (isKing(piece)) {
        const otherKing = piece === whiteKing ? blackKing : whiteKing;
        let adjacentToOtherKing = false;
        let otherKingIndex = -1;

        // Check adjacency first
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
                    const adjacentIndex = nr * gridSize + nc;
                    // Check against the currentPattern for the other king
                    const pieceAtIndex = currentPattern.find(p => p.index === adjacentIndex)?.piece;
                    if (pieceAtIndex === otherKing) {
                        adjacentToOtherKing = true;
                        otherKingIndex = adjacentIndex;
                        break; // Found adjacent king, no need to check other neighbours
                    }
                }
            }
            if (adjacentToOtherKing) break;
        }

        if (adjacentToOtherKing) {
             console.log(`Validation Fail (King Adjacency): Cannot place King ${piece} at [${row},${col}] (${index}) because ${otherKing} is at ${otherKingIndex}.`);
             return false; // Cannot place king adjacent to the other king
        }

        // Check if the square is attacked by the opponent
        const opponentColor = isWhite(piece) ? 'black' : 'white';
        // Check attacks based on pieces already on the board *before* placing this king
        const attackedByOpponent = isSquareAttacked(index, opponentColor, gridSize, currentPattern);

        if (attackedByOpponent) {
            console.log(`Validation Fail (King Check): Cannot place King ${piece} at [${row},${col}] (${index}) because square is attacked by ${opponentColor}. Pattern:`, JSON.stringify(currentPattern));
            return false; // King cannot be placed into check
        }
    }

    // 4. Bishop Color Rule: Bishops of the same side must be on opposite colored squares
    if (isBishop(piece)) {
        const pieceColor = getPieceColor(piece);
        // Find any *already placed* bishop of the *same color*
        const existingBishopOfSameColor = currentPattern.find(p =>
            isBishop(p.piece) && getPieceColor(p.piece) === pieceColor
        );

        if (existingBishopOfSameColor) {
            const existingBishopRow = Math.floor(existingBishopOfSameColor.index / gridSize);
            const existingBishopCol = existingBishopOfSameColor.index % gridSize;
            const existingBishopSquareColor = (existingBishopRow + existingBishopCol) % 2 === 0 ? 'light' : 'dark';

            // If the target square color is the same as the existing bishop's square color, it's invalid
            if (squareColor === existingBishopSquareColor) {
                // console.log(`Validation Fail (Bishop Color): Cannot place ${pieceColor} Bishop ${piece} at [${row},${col}] (${index}) (color ${squareColor}) because another ${pieceColor} bishop exists on a ${existingBishopSquareColor} square (${existingBishopOfSameColor.index}).`);
                return false;
            }
        }
    }

    // 5. Self-Check Prevention: Placing this piece cannot put the friendly king in check.
    // Simulate placing the piece
    const tempPattern = [...currentPattern, { index, piece }];
    const friendlyColor = getPieceColor(piece);
    const opponentColor = friendlyColor === 'white' ? 'black' : 'white';

    // Find the friendly king *after* placing the current piece (it might *be* the king)
    const friendlyKingItem = tempPattern.find(p => p.piece === (friendlyColor === 'white' ? whiteKing : blackKing));

    // If the friendly king exists on the board after this placement...
    if (friendlyKingItem) {
        // ...check if the friendly king's square is attacked by the opponent IN THE NEW STATE
        if (isSquareAttacked(friendlyKingItem.index, opponentColor, gridSize, tempPattern)) {
            // console.log(`Validation Fail (Self-Check): Placing ${piece} at [${row},${col}] (${index}) would put the ${friendlyColor} king at ${friendlyKingItem.index} in check.`);
            return false; // Cannot place a piece if it results in self-check
        }
    }
    // --- Implicit Rule: Mutual Check ---
    // The self-check rule (#5) prevents placing a piece that causes the friendly king to be in check.
    // The king placement rule (#3 - cannot place into check) prevents placing a king onto an attacked square.
    // Together, these should prevent a state where both kings are simultaneously in check *after* a piece is placed.
    // We don't need an explicit "mutual check" rule during placement validation if the other rules are correctly enforced.

    return true; // Placement is valid according to implemented rules
}
