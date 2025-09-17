import { PuzzleRenderer } from './rendering.js';
import { CropManager } from './cropping.js';
import { LeaderboardManager } from './leaderboard.js';

export class UIManager {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.renderer = new PuzzleRenderer(this);
        this.cropManager = new CropManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
        this.setupEventListeners();
    }

    initializeElements() {
        // Canvas elements
        this.canvas = document.getElementById('puzzleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Control elements
        this.imageInput = document.getElementById('imageInput');
        this.difficultySelect = document.getElementById('difficulty');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.hintBtn = document.getElementById('hintBtn');
        this.autoSolveBtn = document.getElementById('autoSolveBtn');
        this.nextMoveBtn = document.getElementById('nextMoveBtn');
        this.leaderboardBtn = document.getElementById('leaderboardBtn');
        this.userRankEl = document.getElementById('userRank');
        
        // Stat elements
        this.moveCountEl = document.getElementById('moveCount');
        this.timeDisplayEl = document.getElementById('timeDisplay');
        this.bestTimeEl = document.getElementById('bestTime');
        this.winMessage = document.getElementById('winMessage');
        this.finalTimeEl = document.getElementById('finalTime');
        this.finalMovesEl = document.getElementById('finalMoves');
        
        // Win message buttons
        this.retryBtn = document.getElementById('retryBtn');
        this.newPuzzleBtn = document.getElementById('newPuzzleBtn');
        
        // Leaderboard elements
        this.playerNameModal = document.getElementById('playerNameModal');
        this.playerNameInput = document.getElementById('playerNameInput');
        this.recordTimeEl = document.getElementById('recordTime');
        this.recordMovesEl = document.getElementById('recordMoves');
        this.recordDifficultyEl = document.getElementById('recordDifficulty');
        this.saveRecordBtn = document.getElementById('saveRecordBtn');
        this.skipRecordBtn = document.getElementById('skipRecordBtn');
        
        this.leaderboardModal = document.getElementById('leaderboardModal');
        this.leaderboardList = document.getElementById('leaderboardList');
        this.clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');
        this.closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
        
        // Shuffle modal elements
        this.shuffleModal = document.getElementById('shuffleModal');
        this.shufflePreviewCanvas = document.getElementById('shufflePreviewCanvas');
        this.shufflePreviewCtx = this.shufflePreviewCanvas.getContext('2d');
        this.shuffleDifficultySelect = document.getElementById('shuffleDifficulty');
        this.startShuffleBtn = document.getElementById('startShuffleBtn');
        this.cancelShuffleBtn = document.getElementById('cancelShuffleBtn');
        
        // Crop elements
        this.cropModal = document.getElementById('cropModal');
        this.cropCanvas = document.getElementById('cropCanvas');
        this.cropCtx = this.cropCanvas.getContext('2d');
        this.cropOverlay = document.getElementById('cropOverlay');
        this.cropSelection = document.getElementById('cropSelection');
        this.cropConfirm = document.getElementById('cropConfirm');
        this.cropCancel = document.getElementById('cropCancel');
    }

    initializeState() {
        this.image = null;
        this.originalImage = null;
        this.tileSize = 0;

        // Load leaderboard data with error handling in case stored JSON is invalid
        this.leaderboard = [];
        const storedLeaderboard = localStorage.getItem('puzzleLeaderboard');
        if (storedLeaderboard) {
            try {
                this.leaderboard = JSON.parse(storedLeaderboard);
            } catch (error) {
                console.warn('Failed to parse stored leaderboard data. Resetting to empty leaderboard.', error);
                this.leaderboard = [];
                localStorage.setItem('puzzleLeaderboard', '[]');
            }
        }
        this.playerName = localStorage.getItem('puzzlePlayerName') || '';
        this.isSelectingFile = false;
        this.shuffleModalTimer = null;
        this.isSyncingDifficulty = false;

        // Animation and effects
        this.particles = [];
        this.animatingTiles = new Map();
        this.lastTime = 0;

        // Callbacks - these will be set by main.js
        this.onImageSelected = null;
        this.onGameStart = null;
        this.onTileClick = null;
        this.onTileHover = null;
        this.onHoverClear = null;
        this.onHint = null;
        this.onAutoSolve = null;
        this.onNextMove = null;
        this.onDifficultyChange = null;
        this.onRetry = null;
        this.onNewImage = null;
        this.onRecordSave = null; // Fired when the player confirms saving a leaderboard entry
    }

    setupEventListeners() {
        this.imageInput.addEventListener('change', (e) => this.cropManager.handleImageUpload(e));
        
        // Handle file dialog cancellation
        this.imageInput.addEventListener('cancel', () => {
            this.isSelectingFile = false;
        });
        
        // Additional safety net - reset flag after a delay when file input loses focus
        this.imageInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.isSelectingFile = false;
            }, 100);
        });

        this.shuffleBtn.addEventListener('click', () => {
            if (this.onGameStart) this.onGameStart();
        });
        
        this.hintBtn.addEventListener('click', () => {
            if (this.onHint) this.onHint();
        });
        
        this.autoSolveBtn.addEventListener('click', () => {
            if (this.onAutoSolve) this.onAutoSolve();
        });
        
        this.nextMoveBtn.addEventListener('click', () => {
            if (this.onNextMove) this.onNextMove();
        });
        
        this.leaderboardBtn.addEventListener('click', () => this.leaderboardManager.showLeaderboard());

        // Player name modal events
        this.saveRecordBtn.addEventListener('click', () => this.leaderboardManager.saveRecord());
        this.skipRecordBtn.addEventListener('click', () => this.leaderboardManager.skipRecord());
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.leaderboardManager.saveRecord();
        });

        // Leaderboard modal events
        this.closeLeaderboardBtn.addEventListener('click', () => this.leaderboardManager.hideLeaderboard());
        this.clearLeaderboardBtn.addEventListener('click', () => this.leaderboardManager.clearLeaderboard());

        // Filter button events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.leaderboardManager.filterLeaderboard(e.target.dataset.difficulty);
            }
        });
        
        // Shuffle modal events
        this.startShuffleBtn.addEventListener('click', () => this.confirmShuffle());
        this.cancelShuffleBtn.addEventListener('click', () => this.cancelShuffle());
        this.difficultySelect.addEventListener('change', () => {
            this.handleDifficultySelectionChange(parseInt(this.difficultySelect.value, 10), 'main');
        });
        if (this.shuffleDifficultySelect) {
            this.shuffleDifficultySelect.addEventListener('change', () => {
                this.handleDifficultySelectionChange(parseInt(this.shuffleDifficultySelect.value, 10), 'modal');
            });
        }
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        
        // Crop event listeners
        this.cropConfirm.addEventListener('click', () => this.cropManager.confirmCrop());
        this.cropCancel.addEventListener('click', () => this.cropManager.cancelCrop());
        // Mouse events for crop
        this.cropOverlay.addEventListener('mousedown', (e) => this.cropManager.onCropMouseDown(e));
        this.cropOverlay.addEventListener('mousemove', (e) => this.cropManager.onCropMouseMove(e));
        this.cropOverlay.addEventListener('mouseup', () => this.cropManager.onCropMouseUp());
        this.cropOverlay.addEventListener('mouseleave', () => this.cropManager.onCropMouseUp());

        // Touch events for mobile crop
        this.cropOverlay.addEventListener('touchstart', (e) => this.cropManager.onCropTouchStart(e));
        this.cropOverlay.addEventListener('touchmove', (e) => this.cropManager.onCropTouchMove(e));
        this.cropOverlay.addEventListener('touchend', () => this.cropManager.onCropTouchEnd());
        this.cropOverlay.addEventListener('touchcancel', () => this.cropManager.onCropTouchEnd());
        
        // Win message button event listeners
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onRetry) this.onRetry();
            });
        }
        
        if (this.newPuzzleBtn) {
            this.newPuzzleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onNewImage) {
                    this.onNewImage();
                } else {
                    this.loadNewImage();
                }
            });
        }
        
        // Also add event delegation as backup
        document.addEventListener('click', (e) => {
            if (e.target.id === 'retryBtn') {
                e.preventDefault();
                e.stopPropagation();
                if (this.onRetry) this.onRetry();
            } else if (e.target.id === 'newPuzzleBtn') {
                e.preventDefault();
                e.stopPropagation();
                if (this.onNewImage) {
                    this.onNewImage();
                } else {
                    this.loadNewImage();
                }
            }
        });
    }

    drawInitialCanvas() {
        this.renderer.drawInitialCanvas();
    }

    handleImageUpload(event) {
        this.cropManager.handleImageUpload(event);
    }

    loadNewImage() {
        this.cropManager.loadNewImage();
    }

    handleCanvasClick(event) {
        // If no image is loaded, trigger file input
        if (!this.image) {
            this.imageInput.click();
            return;
        }
        
        if (this.onTileClick) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Calculate gridSize from tileSize
            const gridSize = Math.round(this.canvas.width / this.tileSize);
            const col = Math.floor(x / this.tileSize);
            const row = Math.floor(y / this.tileSize);
            const clickedIndex = row * gridSize + col;
            
            this.onTileClick(clickedIndex, event.clientX, event.clientY);
        }
    }

    handleCanvasHover(event) {
        // Show pointer cursor when no image is loaded
        if (!this.image) {
            this.canvas.style.cursor = 'pointer';
            return;
        }
        
        if (this.onTileHover) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const gridSize = Math.round(this.canvas.width / this.tileSize);
            const col = Math.floor(x / this.tileSize);
            const row = Math.floor(y / this.tileSize);
            const hoveredIndex = row * gridSize + col;
            
            this.onTileHover(hoveredIndex);
        }
    }

    clearHover() {
        if (!this.image) {
            this.canvas.style.cursor = 'default';
            return;
        }
        if (this.onHoverClear) {
            this.onHoverClear();
        }
    }

    setupPuzzle(gridSize, image) {
        this.image = image;
        this.tileSize = this.canvas.width / gridSize;
        if (this.shuffleDifficultySelect) {
            this.shuffleDifficultySelect.value = gridSize.toString();
        }
        this.drawPuzzle(null, gridSize); // Initial draw
        this.drawPreview();
        this.shuffleBtn.disabled = false;
        this.enableGameButtons();

        // Show shuffle modal immediately
        this.showShuffleModal();
    }

    drawPuzzle(tiles, gridSize, animatingTiles = null, particles = null) {
        this.renderer.drawPuzzle(tiles, gridSize, animatingTiles, particles);
    }

    drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles) {
        this.renderer.drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles);
    }

    drawPreview() {
        this.renderer.drawPreview();
    }

    updateMoveCount(count) {
        this.moveCountEl.textContent = count;
    }

    updateTimer(elapsed) {
        this.timeDisplayEl.textContent = this.formatTime(elapsed);
    }

    updateBestTime(bestTime) {
        this.bestTimeEl.textContent = bestTime ? this.formatTime(bestTime) : '--:--';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showWinMessage(stats) {
        this.finalTimeEl.textContent = this.formatTime(stats.time);
        this.finalMovesEl.textContent = stats.moves;
        this.winMessage.classList.remove('hidden');
        this.disableGameButtons();
    }

    hideWinMessage() {
        this.winMessage.classList.add('hidden');
    }

    enableGameButtons() {
        this.hintBtn.disabled = false;
        this.autoSolveBtn.disabled = false;
        this.nextMoveBtn.disabled = false;
    }

    disableGameButtons() {
        this.hintBtn.disabled = true;
        this.autoSolveBtn.disabled = true;
        this.nextMoveBtn.disabled = true;
    }

    handleDifficultySelectionChange(value, source = 'main') {
        if (Number.isNaN(value)) return;

        const valueStr = value.toString();
        const currentMainValue = this.difficultySelect.value;
        const currentModalValue = this.shuffleDifficultySelect ? this.shuffleDifficultySelect.value : null;

        if (this.isSyncingDifficulty) return;
        this.isSyncingDifficulty = true;

        if (source !== 'main' && currentMainValue !== valueStr) {
            this.difficultySelect.value = valueStr;
        }

        if (this.shuffleDifficultySelect && source !== 'modal' && currentModalValue !== valueStr) {
            this.shuffleDifficultySelect.value = valueStr;
        }

        this.isSyncingDifficulty = false;

        if (this.onDifficultyChange) this.onDifficultyChange(value);
    }

    setDifficultyDisabled(disabled) {
        this.difficultySelect.disabled = disabled;
        if (disabled) {
            this.difficultySelect.classList.add('disabled-during-game');
        } else {
            this.difficultySelect.classList.remove('disabled-during-game');
        }
        if (this.shuffleDifficultySelect) {
            this.shuffleDifficultySelect.disabled = disabled;
            if (disabled) {
                this.shuffleDifficultySelect.classList.add('disabled-during-game');
            } else {
                this.shuffleDifficultySelect.classList.remove('disabled-during-game');
            }
        }
    }

    // Animation methods
    animateTileMove(fromIndex, toIndex, gridSize, tileNumber, callback) {
        this.renderer.animateTileMove(fromIndex, toIndex, gridSize, tileNumber, callback);
    }

    addClickEffect(x, y) {
        this.renderer.addClickEffect(x, y);
    }

    startCelebration() {
        this.renderer.startCelebration();
    }

    updateAndDrawParticles(particles) {
        this.renderer.updateAndDrawParticles(particles);
    }

    highlightTile(index, gridSize, className = 'tile-highlight') {
        this.renderer.highlightTile(index, gridSize, className);
    }

    flashTile(index, gridSize, callback) {
        this.renderer.flashTile(index, gridSize, callback);
    }

    drawCompleteImage() {
        this.renderer.drawCompleteImage();
    }

    // Crop functionality
    showCropModal() {
        this.cropManager.showCropModal();
    }

    setupCropCanvas() {
        this.cropManager.setupCropCanvas();
    }

    initializeCropSelection() {
        this.cropManager.initializeCropSelection();
    }

    updateCropSelection() {
        this.cropManager.updateCropSelection();
    }

    confirmCrop() {
        this.cropManager.confirmCrop();
    }

    cancelCrop() {
        this.cropManager.cancelCrop();
    }

    onCropMouseDown(e) {
        this.cropManager.onCropMouseDown(e);
    }

    onCropMouseMove(e) {
        this.cropManager.onCropMouseMove(e);
    }

    onCropMouseUp() {
        this.cropManager.onCropMouseUp();
    }

    getHandleAtPosition(x, y, customTolerance = null) {
        return this.cropManager.getHandleAtPosition(x, y, customTolerance);
    }

    isInsideCropArea(x, y) {
        return this.cropManager.isInsideCropArea(x, y);
    }

    resizeCropSelection(deltaX, deltaY) {
        this.cropManager.resizeCropSelection(deltaX, deltaY);
    }

    onCropTouchStart(e) {
        this.cropManager.onCropTouchStart(e);
    }

    onCropTouchMove(e) {
        this.cropManager.onCropTouchMove(e);
    }

    onCropTouchEnd() {
        this.cropManager.onCropTouchEnd();
    }

    // Shuffle Modal System
    showShuffleModal() {
        if (!this.image) return;

        // Draw preview in modal
        this.shufflePreviewCtx.clearRect(0, 0, this.shufflePreviewCanvas.width, this.shufflePreviewCanvas.height);
        this.shufflePreviewCtx.drawImage(this.image, 0, 0, this.shufflePreviewCanvas.width, this.shufflePreviewCanvas.height);

        if (this.shuffleDifficultySelect) {
            this.shuffleDifficultySelect.value = this.difficultySelect.value;
        }

        this.shuffleModal.classList.remove('hidden');
    }

    confirmShuffle() {
        this.shuffleModal.classList.add('hidden');
        if (this.onGameStart) this.onGameStart();
    }

    cancelShuffle() {
        this.shuffleModal.classList.add('hidden');
        
        // Reset timer for another attempt
        this.shuffleModalTimer = setTimeout(() => {
            this.showShuffleModal();
        }, 10000); // Show again in 10 seconds
    }

    clearShuffleTimer() {
        if (this.shuffleModalTimer) {
            clearTimeout(this.shuffleModalTimer);
            this.shuffleModalTimer = null;
        }
    }

    // Leaderboard System
    qualifiesForLeaderboard(stats) {
        return this.leaderboardManager.qualifiesForLeaderboard(stats);
    }

    compareScores(a, b) {
        return this.leaderboardManager.compareScores(a, b);
    }

    showPlayerNameModal(stats) {
        this.leaderboardManager.showPlayerNameModal(stats);
    }

    saveRecord() {
        this.leaderboardManager.saveRecord();

        // Keep the cached player name in sync for any callers using the UI
        // facade directly. The LeaderboardManager already persists the name
        // and notifies the orchestrator, so we simply mirror the updated
        // value here to avoid duplicate callbacks.
        this.playerName = this.leaderboardManager.playerName;
    }

    skipRecord() {
        this.leaderboardManager.skipRecord();
    }

    showLeaderboard(highlightId = null) {
        this.leaderboardManager.showLeaderboard(highlightId);
    }

    hideLeaderboard() {
        this.leaderboardManager.hideLeaderboard();
    }

    filterLeaderboard(difficulty) {
        this.leaderboardManager.filterLeaderboard(difficulty);
    }

    renderLeaderboard(difficulty = 'all', highlightId = null) {
        this.leaderboardManager.renderLeaderboard(difficulty, highlightId);
    }

    getSortedLeaderboard() {
        return this.leaderboardManager.getSortedLeaderboard();
    }

    clearLeaderboard() {
        this.leaderboardManager.clearLeaderboard();
    }

    updateUserRank() {
        this.leaderboardManager.updateUserRank();
    }

    addToLeaderboard(record) {
        this.leaderboardManager.addToLeaderboard(record);
    }

    escapeHtml(text) {
        return this.leaderboardManager.escapeHtml(text);
    }

    // Crop mouse/touch handlers are delegated through CropManager wrappers above
}
