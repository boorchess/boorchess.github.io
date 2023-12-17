ArrayList<Enemy> enemies;
ArrayList<Bomb> bombs;
float playerX, playerY;
float playerSize = 20;
float enemySize = 20;
float playerSpeed = 2.5;
float bombActivationRadius = 100;
boolean gameOver = false;
boolean gamePaused = false;

boolean upPressed = false;
boolean downPressed = false;
boolean leftPressed = false;
boolean rightPressed = false;

class Enemy {
    float x, y;
    float enemySpeed = 1.5;

    Enemy(float x, float y) {
        this.x = x;
        this.y = y;
    }

    void moveTowards(float px, float py) {
        float angle = atan2(py - y, px - x);
        x += enemySpeed * cos(angle);
        y += enemySpeed * sin(angle);
    }

    void display() {
        fill(255, 0, 0); // Red color for the enemy
        noStroke(); // Disable stroke
        rect(x, y, enemySize, enemySize);
    }
}

class Bomb {
    float x1, y1, x2, y2;
    boolean active;

    Bomb(float x1, float y1, float x2, float y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.active = true;
    }

    void display() {
        if (active) {
            stroke(255, 255, 0); // Yellow color for the bomb
            line(x1, y1, x2, y2);
        }
    }

    boolean checkHit(float px, float py) {
        float[] closestPoint = closestPoint(px, py, x1, y1, x2, y2);
        return dist(px, py, closestPoint[0], closestPoint[1]) < playerSize / 2;
    }
}

float[] closestPoint(float px, float py, float x1, float y1, float x2, float y2) {
    float dx = x2 - x1;
    float dy = y2 - y1;
    if ((dx == 0) && (dy == 0)) {
        return new float[]{x1, y1};
    }

    float t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    t = max(0, min(1, t));
    return new float[]{x1 + t * dx, y1 + t * dy};
}

void setup() {
    size(800, 600);
    resetGame();
}

void draw() {
    if (!gameOver && !gamePaused) {
        background(0);

        // Player movement
        handlePlayerMovement();

        // Enemy spawn and movement
        handleEnemies();

        // Bomb spawn and display
        handleBombs();
    } else if (gameOver) {
        displayGameOver();
    }

    if (gamePaused && !gameOver) {
        displayPauseMessage();
    }
}

void handlePlayerMovement() {
    if (upPressed) playerY -= playerSpeed;
    if (downPressed) playerY += playerSpeed;
    if (leftPressed) playerX -= playerSpeed;
    if (rightPressed) playerX += playerSpeed;

    playerX = constrain(playerX, 0, width - playerSize);
    playerY = constrain(playerY, 0, height - playerSize);

    fill(0, 0, 255); // Blue color for the player
    noStroke();
    ellipse(playerX, playerY, playerSize, playerSize);
}

void handleEnemies() {
    if (frameCount % 120 == 0) {
        enemies.add(new Enemy(random(width - enemySize), random(height - enemySize)));
    }

    for (Enemy enemy : enemies) {
        enemy.moveTowards(playerX, playerY);
        enemy.display();

        if (dist(playerX, playerY, enemy.x, enemy.y) < playerSize / 2 + enemySize / 2) {
            gameOver = true;
            break;
        }
    }
}

void handleBombs() {
    if (frameCount % 240 == 0) {
        float bombX = random(width - 100);
        float bombY = random(height);
        bombs.add(new Bomb(bombX, bombY, bombX + 100, bombY));
    }

    for (int i = bombs.size() - 1; i >= 0; i--) {
        Bomb bomb = bombs.get(i);
        bomb.display();

        if (bomb.active && bomb.checkHit(playerX, playerY)) {
            activateBomb(bomb);
            bombs.remove(i);
        }
    }
}

void activateBomb(Bomb bomb) {
    for (int i = enemies.size() - 1; i >= 0; i--) {
        Enemy enemy = enemies.get(i);
        if (dist(bomb.x1, bomb.y1, enemy.x, enemy.y) < bombActivationRadius) {
            enemies.remove(i);
        }
    }
}

void keyPressed() {
    if (key == ' ') {
        gamePaused = !gamePaused; // Toggle pause
    } else if (!gamePaused) {
        setKeyState(keyCode, true);
    }
}

void keyReleased() {
    if (!gamePaused) {
        setKeyState(keyCode, false);
    }
}

void setKeyState(int key, boolean state) {
    switch (key) {
        case UP:    upPressed = state; break;
        case DOWN:  downPressed = state; break;
        case LEFT:  leftPressed = state; break;
        case RIGHT: rightPressed = state; break;
    }
}

void resetGame() {
    playerX = width / 2;
    playerY = height / 2;
    enemies = new ArrayList<Enemy>();
    bombs = new ArrayList<Bomb>();
    gameOver = false;
    gamePaused = false;
}

void displayGameOver() {
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Game Over", width / 2, height / 2);
    textSize(20);
    text("Play Again", width / 2, height / 2 + 50);
    // Optionally, draw a rectangle around 'Play Again' to look like a button
}

void displayPauseMessage() {
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Game Paused", width / 2, height / 2);
}

void mousePressed() {
    if (gameOver) {
        float buttonX = width / 2 - 50;
        float buttonY = height / 2 + 50;
        float buttonWidth = 100;
        float buttonHeight = 40;
        if (mouseX > buttonX && mouseX < buttonX + buttonWidth && mouseY > buttonY && mouseY < buttonY + buttonHeight) {
            resetGame();
        }
    }
}
