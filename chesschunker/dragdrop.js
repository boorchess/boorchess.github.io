import { getGameState, recordPlacement } from './gameLogic.js';
import { getPieceColor } from './validation.js'; // Import color checker

let currentlyDraggedPieceElement = null; // Reference to the palette piece DIV being dragged

// Helper to create the piece span (copied from ui.js - consider moving to a shared utility)
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

// --- Drag Handlers for Palette Pieces ---

function handlePaletteDragStart(event) {
    // Check phase directly from gameState
    if (getGameState().currentPhase !== 'recall') {
        event.preventDefault();
        return;
    }
    // Find the span within the dragged div (.palette-piece)
    const pieceSpan = event.target.querySelector('.piece-element');
    if (!pieceSpan) {
        console.error("Could not find piece span in dragged element:", event.target);
        event.preventDefault(); // Prevent drag if structure is wrong
        return;
    }
    // Data is the piece character itself from the span
    const pieceChar = pieceSpan.textContent;
    event.dataTransfer.setData('text/plain', pieceChar);
    event.dataTransfer.effectAllowed = 'copy'; // Use 'copy' as we aren't removing from palette
    currentlyDraggedPieceElement = event.target; // The DIV wrapper
    setTimeout(() => { // Use timeout to allow drag image to be created before applying style
        currentlyDraggedPieceElement?.classList.add('dragging');
    }, 0);
}

function handlePaletteDragEnd(event) {
    // Clean up regardless of drop success or phase
    if (currentlyDraggedPieceElement) {
        currentlyDraggedPieceElement.classList.remove('dragging');
    }
    currentlyDraggedPieceElement = null;
}

// --- Drop Handlers for Grid Cells ---

function handleGridDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    const targetCell = event.target.closest('.grid-cell'); // Ensure we target the cell even if hovering over span
    if (!targetCell) return;

    // Check phase and if the cell is a valid drop target
    if (getGameState().currentPhase === 'recall' && targetCell.classList.contains('drop-target')) {
        // Check if cell is empty (drop-target class should imply this, but double-check using span)
        if (!targetCell.querySelector('.piece-element')) {
             event.dataTransfer.dropEffect = 'copy'; // Show copy cursor
        } else {
            event.dataTransfer.dropEffect = 'none'; // Show not-allowed (cell occupied)
        }
    } else {
        event.dataTransfer.dropEffect = 'none'; // Show not-allowed cursor
    }
}

function handleGridDragEnter(event) {
    event.preventDefault();
    const targetCell = event.target.closest('.grid-cell'); // Ensure we target the cell
    if (!targetCell) return;

     // Check phase and validity
    if (getGameState().currentPhase === 'recall' && targetCell.classList.contains('drop-target') && !targetCell.querySelector('.piece-element')) {
        targetCell.classList.add('drag-over');
    }
}

function handleGridDragLeave(event) {
    const targetCell = event.target.closest('.grid-cell');
    if (!targetCell) return;

    // Check if the relatedTarget (where the mouse moved to) is still within the cell
    // This prevents flickering when moving over the span inside the cell
    if (!targetCell.contains(event.relatedTarget)) {
        targetCell.classList.remove('drag-over');
    }
    // Or simpler: just remove if the target itself has the class
    // if (targetCell.classList.contains('drag-over')) {
    //     targetCell.classList.remove('drag-over');
    // }
}

function handleGridDrop(event) {
    event.preventDefault();
    if (getGameState().currentPhase !== 'recall') return;

    const targetCell = event.target.closest('.grid-cell'); // Ensure target is cell
    if (!targetCell) return;

    targetCell.classList.remove('drag-over'); // Remove hover effect

    // Ensure drop is on a valid, currently designated drop target cell
    if (!targetCell.classList.contains('drop-target')) {
        console.log("Drop rejected: Not a valid drop target.");
        return;
    }
    // Double check emptiness using span
    if (targetCell.querySelector('.piece-element')) {
         console.log("Drop rejected: Target cell already occupied.");
         return;
    }


    const droppedPieceType = event.dataTransfer.getData('text/plain');
    if (!droppedPieceType) return; // No data transferred

    const targetIndex = parseInt(targetCell.dataset.index);

    // Place the piece visually immediately (using the span helper)
    targetCell.innerHTML = ''; // Clear first
    targetCell.appendChild(createPieceSpan(droppedPieceType)); // Use helper
    targetCell.classList.remove('drop-target'); // No longer a drop target once filled

    // Pass event to game logic to check correctness and update state
    recordPlacement(targetIndex, droppedPieceType, targetCell);
}

// --- Attach/Detach Listeners ---

// Store listeners map to remove them correctly
const listenersMap = new WeakMap();

export function attachDragDropListeners(element) {
    let listeners = listenersMap.get(element);
    if (listeners) return; // Already attached

    listeners = {}; // Create a new object to store listeners for this element

    if (element.classList.contains('palette-piece')) {
        listeners.dragstart = handlePaletteDragStart;
        listeners.dragend = handlePaletteDragEnd;
        element.setAttribute('draggable', 'true'); // Ensure draggable is true when attaching
    } else if (element.classList.contains('grid-cell') && element.classList.contains('drop-target')) {
        listeners.dragover = handleGridDragOver;
        listeners.dragenter = handleGridDragEnter;
        listeners.dragleave = handleGridDragLeave;
        listeners.drop = handleGridDrop;
    } else {
        return; // Don't attach if not a palette piece or drop target grid cell
    }

    for (const eventName in listeners) {
        element.addEventListener(eventName, listeners[eventName]);
    }
    listenersMap.set(element, listeners); // Store the listeners
}

export function detachDragDropListeners(element) {
    const listeners = listenersMap.get(element);
    if (!listeners) return; // No listeners to remove

    for (const eventName in listeners) {
        element.removeEventListener(eventName, listeners[eventName]);
    }
    listenersMap.delete(element); // Remove from map

    // Explicitly set draggable to false for pieces when detaching
    if (element.classList.contains('palette-piece')) {
         element.setAttribute('draggable', 'false');
    }
}
