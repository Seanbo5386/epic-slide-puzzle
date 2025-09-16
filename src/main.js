import { GameState } from './game.js';
import { UIManager } from './ui.js';

export class SlidePuzzle {
    constructor() {
        this.game = new GameState();
        this.ui = new UIManager();
        this.init();
    }

    init() {
        this.ui.drawInitialCanvas();
        this.setupCallbacks();
        this.ui.updateBestTime(this.game.getBestTime());
        this.ui.updateUserRank();
    }

    setupCallbacks() {
        // Set up UI callbacks to game actions
        this.ui.onImageSelected = (image) => this.handleImageSelected(image);
        this.ui.onGameStart = () => this.startNewGame();
        this.ui.onTileClick = (index, x, y) => this.handleTileClick(index, x, y);
        this.ui.onTileHover = (index) => this.handleTileHover(index);
        this.ui.onHoverClear = () => this.handleHoverClear();
        this.ui.onHint = () => this.showHint();
        this.ui.onAutoSolve = () => this.autoSolve();
        this.ui.onNextMove = () => this.showNextMove();
        this.ui.onDifficultyChange = (difficulty) => this.onDifficultyChange(difficulty);
        this.ui.onRetry = () => this.retryPuzzle();
        this.ui.onNewImage = () => this.handleNewImageRequest();
        this.ui.onRecordSave = (name) => this.saveRecord(name);
    }

    handleImageSelected(image) {
        const gridSize = parseInt(this.ui.difficultySelect.value);
        this.game.setupGame(gridSize);
        this.ui.setupPuzzle(gridSize, image);
    }

    handleNewImageRequest() {
        this.ui.hideWinMessage();
        this.ui.clearShuffleTimer();
        this.ui.setDifficultyDisabled(false);

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.game.timer) {
            clearInterval(this.game.timer);
            this.game.timer = null;
        }

        this.game.isGameActive = false;
        this.ui.loadNewImage();
    }

    startNewGame() {
        if (!this.ui.image) return;
        
        this.game.startGame();
        this.ui.hideWinMessage();
        this.ui.enableGameButtons();
        this.ui.updateMoveCount(0);
        this.ui.setDifficultyDisabled(true);
        
        // Draw shuffled puzzle
        this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
        
        // Update timer display
        this.startTimerDisplay();
        
        this.ui.clearShuffleTimer();
    }

    startTimerDisplay() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.game.isGameActive) {
            const elapsed = this.game.updateTimer();
            this.ui.updateTimer(elapsed);
        } else {
            this.ui.updateTimer(0);
        }

        this.timerInterval = setInterval(() => {
            if (!this.game.isGameActive) return;

            const elapsed = this.game.updateTimer();
            this.ui.updateTimer(elapsed);
        }, 1000);
    }

    handleTileClick(clickedIndex, clientX, clientY) {
        if (!this.game.isGameActive || !this.ui.image) return;
        
        if (this.game.canMoveTile(clickedIndex)) {
            const emptyPos = this.game.tiles.indexOf(this.game.emptyIndex);
            const tileNumber = this.game.tiles[clickedIndex];
            
            // Start tile animation
            this.ui.animateTileMove(clickedIndex, emptyPos, this.game.gridSize, tileNumber, {
                onAnimationFrame: () => {
                    this.ui.drawPuzzle(this.game.tiles, this.game.gridSize, this.ui.animatingTiles, this.ui.particles);
                },
                onComplete: () => {
                    this.game.makeMove(clickedIndex);
                    this.ui.updateMoveCount(this.game.moveCount);
                    
                    if (this.game.isSolved()) {
                        this.onGameWon();
                    } else {
                        this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
                    }
                }
            });
            
            // Add click effect
            this.ui.addClickEffect(clientX, clientY);
        }
    }

    handleTileHover(hoveredIndex) {
        if (!this.game.isGameActive) return;
        
        this.ui.canvas.style.cursor = this.game.canMoveTile(hoveredIndex) ? 'pointer' : 'default';
        
        if (this.game.canMoveTile(hoveredIndex)) {
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
            this.ui.highlightTile(hoveredIndex, this.game.gridSize);
        }
    }

    handleHoverClear() {
        if (!this.ui.image) {
            this.ui.canvas.style.cursor = 'default';
            return;
        }
        this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
    }

    onGameWon() {
        const stats = this.game.endGame();
        this.ui.setDifficultyDisabled(false);
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Update UI
        this.ui.updateBestTime(this.game.getBestTime());
        this.ui.showWinMessage(stats);
        
        // Check if this qualifies for leaderboard
        if (this.ui.qualifiesForLeaderboard(stats)) {
            setTimeout(() => this.ui.showPlayerNameModal(stats), 1000);
        }
        
        // Update user rank
        setTimeout(() => this.ui.updateUserRank(), 500);
        
        // Start celebration sequence
        this.ui.startCelebration();
        this.animateCelebration();
        
        // Draw complete image after celebration
        this.ui.drawCompleteImage();
    }

    animateCelebration() {
        if (this.ui.particles.length > 0) {
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize, this.ui.animatingTiles, this.ui.particles);
            requestAnimationFrame(() => this.animateCelebration());
        }
    }

    showHint() {
        if (!this.game.isGameActive) return;
        
        const wrongTiles = this.game.getWrongTiles();
        if (wrongTiles.length > 0) {
            const randomWrongTile = wrongTiles[Math.floor(Math.random() * wrongTiles.length)];
            this.flashTile(randomWrongTile);
        }
    }

    flashTile(index) {
        this.ui.flashTile(index, this.game.gridSize, () => {
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
        });
    }

    autoSolve() {
        if (!this.game.isGameActive || this.game.isSolving) return;
        
        // Check if already solved
        if (this.game.isSolved()) {
            this.ui.autoSolveBtn.textContent = '✅ Already Solved!';
            setTimeout(() => {
                this.ui.autoSolveBtn.textContent = '🤖 Auto-Solve';
            }, 2000);
            return;
        }
        
        this.game.isSolving = true;
        this.ui.autoSolveBtn.textContent = '🔄 Solving...';
        this.ui.autoSolveBtn.disabled = true;
        
        try {
            // Store original state to restore if needed
            this.originalGameState = [...this.game.tiles];
            this.originalMoveCount = this.game.moveCount;

            // Find solution path
            this.game.solveMoves = this.game.findSolution();
            this.game.currentSolveStep = 0;

            // Restore original state for execution
            this.game.tiles = [...this.originalGameState];

            if (this.game.solveMoves.length === 0) {
                this.handleSolveFailure('❌ No Solution Found');
                return;
            }

            this.executeSolveMoves();
        } catch (error) {
            console.error('Auto-solve error:', error);
            this.handleSolveFailure('❌ Solve Failed');
        }
    }

    handleSolveFailure(message = '❌ Solve Failed') {
        this.game.isSolving = false;

        if (this.originalGameState) {
            this.game.tiles = [...this.originalGameState];
        }

        if (this.game) {
            this.game.currentSolveStep = 0;
            this.game.solveMoves = [];
        }

        if (typeof this.originalMoveCount === 'number') {
            this.game.moveCount = this.originalMoveCount;
            if (this.ui && typeof this.ui.updateMoveCount === 'function') {
                this.ui.updateMoveCount(this.game.moveCount);
            }
        }

        if (this.ui && typeof this.ui.drawPuzzle === 'function') {
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
        }

        if (this.ui && this.ui.autoSolveBtn) {
            this.ui.autoSolveBtn.textContent = message;
            this.ui.autoSolveBtn.disabled = false;
        }

        if (this.ui && typeof this.ui.enableGameButtons === 'function') {
            this.ui.enableGameButtons();
        }

        setTimeout(() => {
            if (this.ui && this.ui.autoSolveBtn) {
                this.ui.autoSolveBtn.textContent = '🤖 Auto-Solve';
            }
        }, 2000);
    }

    executeSolveMoves() {
        // Safety check to prevent infinite loops
        if (this.game.currentSolveStep >= this.game.solveMoves.length || this.game.currentSolveStep > 100) {
            if (this.game.isSolved()) {
                this.game.isSolving = false;
                this.ui.autoSolveBtn.textContent = '✅ Complete!';

                // Re-enable difficulty changes when auto-solve completes
                this.ui.setDifficultyDisabled(false);

                setTimeout(() => {
                    this.ui.autoSolveBtn.textContent = '🤖 Auto-Solve';
                    this.ui.autoSolveBtn.disabled = false;
                    this.ui.enableGameButtons();
                }, 2000);
            } else {
                console.warn('Auto-solve finished without solving the puzzle. Restoring original state.');
                this.handleSolveFailure('❌ Solve Failed');
            }
            return;
        }
        
        const moveIndex = this.game.solveMoves[this.game.currentSolveStep];
        const emptyPos = this.game.tiles.indexOf(this.game.emptyIndex);
        
        // Validate the move before executing
        if (moveIndex < 0 || moveIndex >= this.game.tiles.length || !this.game.canMoveTile(moveIndex)) {
            console.warn('Invalid move in auto-solve:', moveIndex);
            this.game.currentSolveStep++;
            setTimeout(() => this.executeSolveMoves(), 100);
            return;
        }
        
        // Highlight the move
        this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
        this.ui.highlightTile(moveIndex, this.game.gridSize, 'solving-animation');
        
        setTimeout(() => {
            // Double-check the move is still valid
            if (this.game.canMoveTile(moveIndex)) {
                this.game.swapTiles(moveIndex, emptyPos);
                this.game.moveCount++;
                this.ui.updateMoveCount(this.game.moveCount);
            }
            
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
            
            if (this.game.isSolved()) {
                this.onGameWon();
                this.game.isSolving = false;
                this.ui.autoSolveBtn.textContent = '✅ Solved!';
                return;
            }
            
            this.game.currentSolveStep++;
            
            // Continue with next move
            if (this.game.isSolving) {
                setTimeout(() => this.executeSolveMoves(), 600);
            }
        }, 400);
    }

    showNextMove() {
        if (!this.game.isGameActive) return;
        
        const nextMove = this.game.findNextBestMove();
        
        if (nextMove !== -1) {
            this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
            this.ui.highlightTile(nextMove, this.game.gridSize, 'next-move-highlight');
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                this.ui.drawPuzzle(this.game.tiles, this.game.gridSize);
            }, 3000);
        }
    }

    onDifficultyChange(newGridSize) {
        // The difficulty select is disabled during gameplay, so this shouldn't trigger
        // But we'll keep this check as a safety measure
        if (this.game.isGameActive) {
            this.ui.difficultySelect.value = this.game.gridSize.toString();
            return;
        }
        
        this.game.gridSize = newGridSize;
        this.ui.updateBestTime(this.game.getBestTime());
        this.ui.clearShuffleTimer(); // Clear any pending modal
        
        if (this.ui.image) {
            this.game.setupGame(newGridSize);
            this.ui.setupPuzzle(newGridSize, this.ui.image);
        }
    }

    retryPuzzle() {
        this.ui.hideWinMessage();
        this.startNewGame();
    }

    saveRecord(name) {
        if (!this.game.lastGameStats) return;
        
        // Add to leaderboard
        const record = {
            ...this.game.lastGameStats,
            name: name,
            id: Date.now() + Math.random()
        };
        
        this.ui.addToLeaderboard(record);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating SlidePuzzle instance');
    new SlidePuzzle();
});
