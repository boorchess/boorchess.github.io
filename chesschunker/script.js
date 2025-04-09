import { config } from './config.js';
import { initializeGameLogic, startGame as startGameLogic, getGameState } from './gameLogic.js';
import { initializeUI, createGrid, updateMessage } from './ui.js';
import { initializeInstructions } from './instructions.js';

function handleStartClick() {
    const gameState = getGameState(); 
    startGameLogic();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing...");
    const { startButton } = initializeUI(); 

    initializeInstructions(); 

    initializeGameLogic();

    const initialGameState = getGameState();
    createGrid(initialGameState.currentGridSize);

    startButton.addEventListener('click', handleStartClick);

    updateMessage('Press Start Game to begin!');
    console.log("Initialization complete.");
});
