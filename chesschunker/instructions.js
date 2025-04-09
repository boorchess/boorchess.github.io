// --- Instructions Modal Logic ---

let instructionsModal;
let closeButton;
let instructionsButton; // Reference to the button that opens the modal

function showInstructions() {
    if (instructionsModal) {
        instructionsModal.classList.remove('hidden');
    }
}

function hideInstructions() {
    if (instructionsModal) {
        instructionsModal.classList.add('hidden');
    }
}

export function initializeInstructions() {
    instructionsModal = document.getElementById('instructions-modal');
    closeButton = instructionsModal ? instructionsModal.querySelector('.close-button') : null;
    instructionsButton = document.getElementById('instructions-button');

    if (!instructionsModal || !closeButton || !instructionsButton) {
        console.error("Instructions modal elements not found!");
        return;
    }

    // Event listener for the Instructions button
    instructionsButton.addEventListener('click', showInstructions);

    // Event listener for the close button
    closeButton.addEventListener('click', hideInstructions);

    // Event listener to close modal if user clicks outside the content area
    instructionsModal.addEventListener('click', (event) => {
        if (event.target === instructionsModal) { // Check if the click is on the overlay itself
            hideInstructions();
        }
    });

    // Optional: Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !instructionsModal.classList.contains('hidden')) {
            hideInstructions();
        }
    });

    console.log("Instructions modal initialized.");
}
