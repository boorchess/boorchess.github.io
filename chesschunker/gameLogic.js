import { config } from './config.js';
import {
    updateMessage, updateTimerDisplay, updateControls, createGrid,
    displayPatternOnGrid, hidePatternOnGrid, clearBoard,
    revealIncorrectPattern, setGridAndPaletteInteraction, showCellFeedback,
    getUIElements
} from './ui.js';
import { playSuccessSound, playErrorSound } from './audio.js';
import { generatePattern } from './patternGenerator.js';

const ABSOLUTE_STARTING_GRID_SIZE = 3;
const ABSOLUTE_STARTING_LEVEL = 2; 
const MAX_GRID_SIZE = 8;

let gameState = {
    currentGridSize: ABSOLUTE_STARTING_GRID_SIZE,
    currentLevel: ABSOLUTE_STARTING_LEVEL,
    maxReachedGridSize: ABSOLUTE_STARTING_GRID_SIZE,
    consecutiveIncorrectAttempts: 0,
    gameSessionActive: false,
    currentPhase: 'idle',
    pattern: [],
    placedPiecesCount: 0,
    incorrectDropOccurred: false,
    timerInterval: null,
    remainingTime: 0,
};

export function initializeGameLogic(gridSize = ABSOLUTE_STARTING_GRID_SIZE, level = ABSOLUTE_STARTING_LEVEL) {
    gameState.currentGridSize = gridSize;
    gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, level); 
    gameState.maxReachedGridSize = Math.max(gameState.maxReachedGridSize, gridSize);
    gameState.currentPhase = 'idle';
    gameState.gameSessionActive = false;
    gameState.consecutiveIncorrectAttempts = 0;
    console.log(`Game logic initialized/reset: Grid=${gridSize}, Pieces=${gameState.currentLevel}`);
}

export function startGame() {
    if (!['idle', 'feedback', 'gameover'].includes(gameState.currentPhase)) {
        console.warn("startGame called during unexpected phase:", gameState.currentPhase);
        return;
    }

    if (!gameState.gameSessionActive) {
        if (gameState.currentPhase === 'idle' || gameState.currentPhase === 'gameover') {
             initializeGameLogic(ABSOLUTE_STARTING_GRID_SIZE, ABSOLUTE_STARTING_LEVEL);
             console.log("Starting new game session from absolute start values.");
        }
        gameState.gameSessionActive = true;
        gameState.consecutiveIncorrectAttempts = 0; 
    } else {
        console.log(`Continuing session: Grid=${gameState.currentGridSize}, Pieces=${gameState.currentLevel}`);
    }

    updateControls(false, true);
    updateMessage('');
    updateTimerDisplay(null); 
    gameState.incorrectDropOccurred = false;
    gameState.placedPiecesCount = 0;

    createGrid(gameState.currentGridSize);

    const maxPiecesForGrid = gameState.currentGridSize * gameState.currentGridSize;
    // Ensure requested level doesn't exceed grid capacity or drop below minimum
    gameState.currentLevel = Math.min(gameState.currentLevel, maxPiecesForGrid);
    gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel);
    console.log(`Attempting to generate pattern for Level ${gameState.currentLevel} on ${gameState.currentGridSize}x${gameState.currentGridSize} grid.`);

    gameState.pattern = generatePattern(gameState.currentGridSize, gameState.currentLevel);

    // --- ADJUSTED Check for Generation Failure ---
    // Reset only if pattern generation failed completely (returned []) or has fewer than 2 pieces (kings failed).
    // ABSOLUTE_STARTING_LEVEL is the minimum required (currently 2 for the kings).
    if (!gameState.pattern || gameState.pattern.length < ABSOLUTE_STARTING_LEVEL) {
        console.error(`Pattern generation FAILED or returned fewer than ${ABSOLUTE_STARTING_LEVEL} pieces (got ${gameState.pattern?.length || 0}) for requested Level ${gameState.currentLevel} on ${gameState.currentGridSize}x${gameState.currentGridSize}. Resetting game.`);
        updateMessage(`Error: Could not create a valid pattern for this level (${gameState.currentLevel} pieces on ${gameState.currentGridSize}x${gameState.currentGridSize}). Resetting.`);
        initializeGameLogic(ABSOLUTE_STARTING_GRID_SIZE, ABSOLUTE_STARTING_LEVEL);
        gameState.currentPhase = 'idle';
        gameState.gameSessionActive = false;
        updateControls(true, false);
        createGrid(gameState.currentGridSize); // Recreate initial grid
        return;
    }

    // --- Update the actual level based on what was generated ---
    // This is crucial if generatePattern returned fewer pieces than requested.
    gameState.currentLevel = gameState.pattern.length;
    // Ensure the level doesn't fall below the absolute minimum after generation
    gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel);

    displayMemorizationPhase();
}

function displayMemorizationPhase() {
    gameState.currentPhase = 'memorize';
    setGridAndPaletteInteraction(false); 
    // Use the potentially adjusted gameState.currentLevel
    updateMessage(`Level ${gameState.currentLevel} (${gameState.currentGridSize}x${gameState.currentGridSize}): Memorize ${gameState.pattern.length} pieces...`);

    clearBoard(); 
    displayPatternOnGrid(gameState.pattern); 

    // Calculate memorization time based on the *actual* number of pieces shown
    const calculatedTime = Math.ceil((gameState.pattern.length * config.memorizeTimeFactor) / 1000);
    const minTime = config.minMemorizeTime / 1000;
    gameState.remainingTime = Math.max(minTime, calculatedTime);

    startTimer(() => {
        hidePatternOnGrid(gameState.pattern); 
        startRecallPhase(); 
    });
}

function startRecallPhase() {
    gameState.currentPhase = 'recall';
    // Use the potentially adjusted gameState.currentLevel
    updateMessage(`Level ${gameState.currentLevel} (${gameState.currentGridSize}x${gameState.currentGridSize}): Recall... Drag ${gameState.pattern.length} pieces to the board.`);
    gameState.placedPiecesCount = 0;
    gameState.incorrectDropOccurred = false;

    setGridAndPaletteInteraction(true); 
    stopTimer(); 
    updateTimerDisplay(null); 

}

export function recordPlacement(targetIndex, droppedPieceType, targetCell) {
    if (gameState.currentPhase !== 'recall' || gameState.incorrectDropOccurred) return;

    const expectedPatternItem = gameState.pattern.find(item => item.index === targetIndex);
    const isCorrect = !!expectedPatternItem && expectedPatternItem.piece === droppedPieceType;

    showCellFeedback(targetCell, isCorrect); 

    if (isCorrect) {
        playSuccessSound();
        gameState.placedPiecesCount++;
        if (gameState.placedPiecesCount === gameState.pattern.length) {
            setTimeout(() => endGame(true, 'Pattern matched successfully!'), config.feedbackDelay);
        }
    } else {
        playErrorSound();
        gameState.incorrectDropOccurred = true; 
        setTimeout(() => endGame(false, 'Incorrect placement!'), config.feedbackDelay);
    }
}

function endGame(success, msg) {
    if (gameState.currentPhase === 'memorize') {
        stopTimer();
    }
    // Allow ending from 'recall' or 'memorize' (if time ran out instantly - unlikely but possible)
    if (!['recall', 'memorize'].includes(gameState.currentPhase)) {
        console.warn("endGame called during unexpected phase:", gameState.currentPhase);
        // Don't return, proceed to feedback phase but log the warning.
    }

    gameState.currentPhase = 'feedback'; 
    setGridAndPaletteInteraction(false); 

    let nextRoundMsg = msg;

    if (success) {
        gameState.consecutiveIncorrectAttempts = 0;

        let progressed = false;
        // Check grid size progression FIRST: If current level meets or exceeds grid size, try increasing grid.
        if (gameState.currentGridSize < MAX_GRID_SIZE && gameState.currentLevel >= gameState.currentGridSize) {
             gameState.currentGridSize++;
             // When grid size increases, set the next level to match the new grid size
             gameState.currentLevel = gameState.currentGridSize;
             nextRoundMsg += ` Grid size increased to ${gameState.currentGridSize}x${gameState.currentGridSize}!`;
             progressed = true;
        }
        // ELSE, if grid didn't increase, try increasing the level on the current grid size.
        else if (gameState.currentLevel < (gameState.currentGridSize * gameState.currentGridSize)) {
             gameState.currentLevel++;
             nextRoundMsg += ` Level increased!`;
             progressed = true;
        }

        if (progressed) {
             // Clamp level just in case (shouldn't be needed with above logic but safe)
             gameState.currentLevel = Math.min(gameState.currentLevel, gameState.currentGridSize * gameState.currentGridSize);
             // Ensure level doesn't drop below absolute minimum
             gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel);

             gameState.maxReachedGridSize = Math.max(gameState.maxReachedGridSize, gameState.currentGridSize);
             nextRoundMsg += ` Progressing to level ${gameState.currentLevel} on ${gameState.currentGridSize}x${gameState.currentGridSize}.`;
        } else {
            // Reached max level on max grid size
             nextRoundMsg += ` Reached max progression! Repeating level ${gameState.currentLevel} on ${MAX_GRID_SIZE}x${MAX_GRID_SIZE} grid.`;
             // Keep currentGridSize and currentLevel as they are
        }

        updateMessage(nextRoundMsg);
        setTimeout(startGame, config.nextRoundDelay);

    } else { // Incorrect attempt
        gameState.consecutiveIncorrectAttempts++;
        revealIncorrectPattern(gameState.pattern);

        if (gameState.consecutiveIncorrectAttempts >= config.maxIncorrectAttempts) {
            gameOver(`Game Over! ${gameState.consecutiveIncorrectAttempts} consecutive errors. Last attempt: Level ${gameState.currentLevel} on ${gameState.currentGridSize}x${gameState.currentGridSize}.`);
            return;
        }

        // --- Regression Logic ---
        // Decrease level first
        gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel - 1);

        // If level drops significantly below grid size potential, consider reducing grid size
        // Example: Reduce grid if level drops below (gridSize - 1) AND grid is not already at minimum
        if (gameState.currentGridSize > ABSOLUTE_STARTING_GRID_SIZE && gameState.currentLevel < (gameState.currentGridSize -1) ) {
             gameState.currentGridSize--;
             // Adjust level to be within the new grid size capacity, but not necessarily maxed out.
             // Let's set it to the new grid size for simplicity upon regression.
             gameState.currentLevel = gameState.currentGridSize;
             // Ensure level doesn't drop below absolute minimum
             gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel);
             nextRoundMsg += ` Grid size reduced to ${gameState.currentGridSize}x${gameState.currentGridSize}.`;
        }

        // Ensure level is still valid after potential grid change / decrease
        gameState.currentLevel = Math.min(gameState.currentLevel, gameState.currentGridSize * gameState.currentGridSize);
        gameState.currentLevel = Math.max(ABSOLUTE_STARTING_LEVEL, gameState.currentLevel);

        nextRoundMsg += ` Incorrect. Trying Level ${gameState.currentLevel} on ${gameState.currentGridSize}x${gameState.currentGridSize}. (${config.maxIncorrectAttempts - gameState.consecutiveIncorrectAttempts} attempts left)`;
        updateMessage(nextRoundMsg);

        setTimeout(startGame, config.nextRoundDelay);
    }
}

function gameOver(finalMsg) {
    gameState.currentPhase = 'gameover';
    gameState.gameSessionActive = false; 
    stopTimer(); 
    updateMessage(finalMsg);
    setGridAndPaletteInteraction(false); 
    updateControls(true, false); 

    console.log("Game Over state reached.");
}

function startTimer(callback) {
    stopTimer(); 
    updateTimerDisplay(gameState.remainingTime); 

    gameState.timerInterval = setInterval(() => {
        gameState.remainingTime--;
        updateTimerDisplay(gameState.remainingTime); 
        if (gameState.remainingTime <= 0) {
            stopTimer(); 
            updateTimerDisplay(0); 
            if (callback) {
                callback(); 
            }
        }
    }, 1000); 
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

export function getGameState() {
    return { ...gameState };
}
