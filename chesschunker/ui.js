import { config } from './config.js';
import { getGameState } from './gameLogic.js'; // Import state accessor
import { attachDragDropListeners, detachDragDropListeners } from './dragdrop.js';
import { getPieceColor } from './validation.js'; // Import color checker

// --- DOM Element References ---
let gameBoard, startButton, messageElement, timerContainer, timerSpan, leftPalette, rightPalette, leftPalettePieces, rightPalettePieces, instructionsButton;

// Helper to create the piece span with appropriate color class
function createPieceSpan(piece) {
    if (!piece) return document.createTextNode(''); // Return empty text node if no piece

    const span = document.createElement('span');
    span.classList.add('piece-element'); // Base class for the span
    const color = getPieceColor(piece);

    if (color === 'white') {
        span.classList.add('white-piece');
    } else if (color === 'black') {
        span.classList.add('black-piece');
    } else {
        // Fallback for unknown pieces, maybe default to black styling
        console.warn(`Piece ${piece} has unknown color.`);
        span.classList.add('black-piece');
    }
    span.textContent = piece;
    return span;
}

// Function to get references, run once on init
export function initializeUI() {
    gameBoard = document.getElementById('game-board');
    startButton = document.getElementById('start-button');
    messageElement = document.getElementById('message');
    timerContainer = document.getElementById('timer');
    timerSpan = document.getElementById('time');
    leftPalette = document.getElementById('left-piece-palette');
    rightPalette = document.getElementById('right-piece-palette');
    leftPalettePieces = leftPalette.querySelector('.palette-pieces');
    rightPalettePieces = rightPalette.querySelector('.palette-pieces');
    instructionsButton = document.getElementById('instructions-button');

    populateStaticPalettes(); // Populate palettes on load

    // Return elements needed by other modules
    return { gameBoard, startButton, messageElement, timerContainer, timerSpan, leftPalette, rightPalette, instructionsButton };
}

// --- UI Update Functions ---

export function updateMessage(msg) {
    if (messageElement) {
        messageElement.textContent = msg;
    }
}

export function updateTimerDisplay(time) {
    // Handle potential null/undefined time for hiding
    const displayTime = time !== null && time !== undefined ? time : '';
    if (timerSpan) {
        timerSpan.textContent = displayTime;
    }
    if (timerContainer) {
        // Show if time is a non-negative number, hide otherwise
        // Important: Ensures timer is hidden when null is passed (e.g., recall phase)
        timerContainer.style.display = (typeof time === 'number' && time >= 0) ? 'block' : 'none';
    }
}

export function updateControls(enabled, sessionActive = false) {
    if (startButton && instructionsButton) {
        startButton.disabled = !enabled || sessionActive; // Disable start if session active OR controls generally disabled
        instructionsButton.disabled = !enabled; // Disable instructions only if controls generally disabled, allow during session

        // Adjust start button text based on state
        if (!enabled && sessionActive) {
            startButton.textContent = 'Session in Progress';
        } else if (enabled && !sessionActive) {
            startButton.textContent = 'Start Game';
        } else {
            // Fallback or other states (e.g., if called with enabled=false, sessionActive=false)
            startButton.textContent = 'Start Game';
        }
    }
    // Palette enabling/disabling handled separately in setGridAndPaletteInteraction based on game phase
}

export function createGrid(size) {
    if (!gameBoard) return;
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    // --- Use Fixed Size for Cell Calculation ---
    // The grid container (.main-game-area or .grid itself) now has a fixed size via CSS.
    // We calculate cell size based on the actual rendered size of the grid element.
    const gridPixelSize = gameBoard.clientWidth; // Get the current width (should be fixed by CSS)

    // Ensure gridPixelSize is a positive number before calculating cell size
    if (gridPixelSize <= 0) {
        console.error("Grid container has zero or negative width. Cannot calculate cell size.");
        // Fallback or wait for layout? For now, let's use a default minimum.
        // This might happen if called before layout is complete. Consider a ResizeObserver or deferral.
        // Using a temporary small default might be better than erroring out.
        const fallbackGridSize = 300; // A reasonable minimum fallback
        const cellSize = Math.max(10, Math.floor(fallbackGridSize / size));
        console.warn(`Using fallback grid size ${fallbackGridSize}px for cell calculation.`);
        // Apply fallback size to grid element if needed? Or assume CSS will eventually fix it.
        // gameBoard.style.width = `${fallbackGridSize}px`;
        // gameBoard.style.height = `${fallbackGridSize}px`;
    } else {
        const cellSize = Math.max(10, Math.floor(gridPixelSize / size)); // Min cell size 10px

        // Clear any previously set inline width/height styles that might conflict with CSS
        gameBoard.style.width = '';
        gameBoard.style.height = '';

        for (let i = 0; i < size * size; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;
            // Set cell size based on calculation
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            // Adjust font size based on cell size for the pieces within
            cell.style.fontSize = `${Math.max(14, Math.floor(cellSize * 0.65))}px`;

            const row = Math.floor(i / size);
            const col = i % size;
            cell.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');

            gameBoard.appendChild(cell);
        }
    }
}

export function displayPatternOnGrid(pattern) {
    if (!gameBoard) return;
    // Clear previous pieces/highlights first
    clearBoard(); // Clears innerHTML

    pattern.forEach(item => {
        const cell = gameBoard.children[item.index];
        if (cell) {
            // No highlight during memorization
            cell.innerHTML = ''; // Clear first just in case
            cell.appendChild(createPieceSpan(item.piece)); // Use helper
        }
    });
}

export function hidePatternOnGrid(pattern) {
    if (!gameBoard) return;
    pattern.forEach(item => {
        const cell = gameBoard.children[item.index];
        if (cell) {
            cell.innerHTML = ''; // Clear the piece span visually for recall
        }
    });
}

// Clears pieces, highlights, feedback from the board
export function clearBoard() {
    if (!gameBoard) return;
    Array.from(gameBoard.children).forEach(cell => {
        cell.innerHTML = ''; // Clear content including span
        // Only remove specific feedback/state classes, keep light/dark base styles
        cell.classList.remove('highlight', 'correct', 'incorrect', 'drag-over', 'drop-target');
    });
}

export function revealIncorrectPattern(pattern) {
    if (!gameBoard) return;
    const expectedIndices = new Set(pattern.map(p => p.index));

    // First pass: Mark correct/incorrect based on user placement vs pattern
    pattern.forEach(item => {
        const cell = gameBoard.children[item.index];
        if (cell) {
            const userPieceSpan = cell.querySelector('.piece-element');
            const userPiece = userPieceSpan ? userPieceSpan.textContent : null;

            // Clear previous content before adding new span/feedback
            // We keep the correct/incorrect classes added by showCellFeedback earlier if applicable
            cell.innerHTML = '';

            if (!userPiece) {
                // User missed this square completely
                cell.appendChild(createPieceSpan(item.piece)); // Show correct piece
                cell.classList.add('highlight'); // Highlight missed squares
            } else if (userPiece !== item.piece) {
                // User placed the WRONG piece here. Already marked 'incorrect'.
                cell.appendChild(createPieceSpan(item.piece)); // Show the piece that *should* be here
                cell.classList.add('incorrect'); // Ensure incorrect class is present
            } else {
                // User placed the CORRECT piece here. Already marked 'correct'.
                cell.appendChild(createPieceSpan(item.piece)); // Keep showing correct piece
                // Ensure correct class is present
                cell.classList.add('correct');
            }
            // Remove temporary states
            cell.classList.remove('drag-over', 'drop-target');
        }
    });

    // Second pass: Mark squares where user placed a piece, but should be empty
    Array.from(gameBoard.children).forEach((cell, index) => {
        if (!expectedIndices.has(index)) {
            const userPieceSpan = cell.querySelector('.piece-element');
            if (userPieceSpan) {
                // This cell should be empty, but user placed something here.
                cell.classList.add('incorrect'); // Mark as incorrect placement
                // Keep the user's incorrect piece visible to show *what* they put incorrectly.
            }
        }
        // Also remove temporary states from potentially empty cells
        if (!cell.querySelector('.piece-element')) {
            cell.classList.remove('drag-over', 'drop-target');
        }
    });
}

export function showCellFeedback(cell, isCorrect) {
    // Remove previous feedback first in case of rapid interaction (though unlikely with delay)
    cell.classList.remove('correct', 'incorrect');
    // Add new feedback
    cell.classList.add(isCorrect ? 'correct' : 'incorrect');
    // Feedback is cleared by clearBoard() at the start of the next round/memorization phase
}

// --- Static Piece Palette Population ---
function populateStaticPalettes() {
    if (!leftPalettePieces || !rightPalettePieces) return;

    leftPalettePieces.innerHTML = ''; // Clear existing
    rightPalettePieces.innerHTML = ''; // Clear existing

    const whitePieces = Object.values(config.chessPieces.white);
    const blackPieces = Object.values(config.chessPieces.black);

    whitePieces.forEach(piece => {
        const pieceElement = createPalettePieceElement(piece);
        leftPalettePieces.appendChild(pieceElement);
    });

    blackPieces.forEach(piece => {
        const pieceElement = createPalettePieceElement(piece);
        rightPalettePieces.appendChild(pieceElement);
    });
}

function createPalettePieceElement(piece) {
    const pieceElement = document.createElement('div');
    pieceElement.classList.add('palette-piece');
    pieceElement.appendChild(createPieceSpan(piece)); // Use helper
    pieceElement.draggable = true; // Draggable state controlled by setGridAndPaletteInteraction
    return pieceElement;
}

// --- Interaction Control ---
// Controls interaction for BOTH grid cells and palettes based on game phase
export function setGridAndPaletteInteraction(enableInteraction) {
    if (!gameBoard || !leftPalette || !rightPalette) return;

    const gameState = getGameState();
    const currentPhase = gameState.currentPhase;
    const isRecall = currentPhase === 'recall';
    const isFeedback = currentPhase === 'feedback';

    // --- Grid Interaction ---
    if (isRecall) {
        // Enable Grid Drop Zones during recall
        gameBoard.classList.remove('disabled');
        Array.from(gameBoard.children).forEach(cell => {
            // Only empty cells without feedback are drop targets
            if (!cell.textContent && !cell.classList.contains('correct') && !cell.classList.contains('incorrect')) {
                cell.classList.add('drop-target');
                attachDragDropListeners(cell); // Attach D&D listeners
            } else {
                cell.classList.remove('drop-target');
                detachDragDropListeners(cell); // Remove listeners if cell has content or feedback
            }
        });
    } else {
        // Disable Grid Drop Zones in all other phases
        gameBoard.classList.add('disabled');
        Array.from(gameBoard.children).forEach(cell => {
            cell.classList.remove('drop-target', 'drag-over');
            detachDragDropListeners(cell); // Remove D&D listeners from all cells
        });
    }

    // --- Palette Interaction & Visibility ---
    const enableDragging = isRecall; // Only allow dragging during recall
    const showPalettes = isRecall || isFeedback; // Show palettes during recall and feedback

    leftPalette.classList.toggle('disabled', !enableDragging);
    rightPalette.classList.toggle('disabled', !enableDragging);
    leftPalette.classList.toggle('hidden', !showPalettes);
    rightPalette.classList.toggle('hidden', !showPalettes);

    document.querySelectorAll('.palette-piece').forEach(p => {
        p.draggable = enableDragging;
        if (enableDragging) {
            attachDragDropListeners(p); // Attach drag start/end listeners
        } else {
            detachDragDropListeners(p); // Detach listeners when not draggable
        }
    });
}

// --- Utility to get UI elements (if needed by other modules) ---
export function getUIElements() {
    // Ensure elements are initialized if not already
    if (!gameBoard) {
        console.warn("getUIElements called before initializeUI completed.");
        // Attempt re-initialization or return nulls
        return initializeUI(); // Rerun init, assumes it's safe
    }
    return { gameBoard, startButton, messageElement, timerContainer, timerSpan, leftPalette, rightPalette, instructionsButton };
}
