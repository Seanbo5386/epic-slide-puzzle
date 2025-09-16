export class UIManager {
    constructor() {
        this.initializeElements();
        this.initializeState();
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
        this.leaderboard = JSON.parse(localStorage.getItem('puzzleLeaderboard') || '[]');
        this.playerName = localStorage.getItem('puzzlePlayerName') || '';
        this.isSelectingFile = false;
        this.shuffleModalTimer = null;
        
        // Animation and effects
        this.particles = [];
        this.animatingTiles = new Map();
        this.lastTime = 0;
        
        // Crop state
        this.cropState = {
            isDragging: false,
            isResizing: false,
            dragHandle: null,
            startX: 0,
            startY: 0,
            startCropX: 0,
            startCropY: 0,
            startCropWidth: 0,
            startCropHeight: 0,
            cropX: 50,
            cropY: 50,
            cropWidth: 200,
            cropHeight: 200,
            canvasScale: 1
        };
        
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
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
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
        
        this.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        
        // Player name modal events
        this.saveRecordBtn.addEventListener('click', () => this.saveRecord());
        this.skipRecordBtn.addEventListener('click', () => this.skipRecord());
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveRecord();
        });
        
        // Leaderboard modal events
        this.closeLeaderboardBtn.addEventListener('click', () => this.hideLeaderboard());
        this.clearLeaderboardBtn.addEventListener('click', () => this.clearLeaderboard());
        
        // Filter button events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.filterLeaderboard(e.target.dataset.difficulty);
            }
        });
        
        // Shuffle modal events
        this.startShuffleBtn.addEventListener('click', () => this.confirmShuffle());
        this.cancelShuffleBtn.addEventListener('click', () => this.cancelShuffle());
        this.difficultySelect.addEventListener('change', () => {
            if (this.onDifficultyChange) this.onDifficultyChange(parseInt(this.difficultySelect.value));
        });
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHover());
        
        // Crop event listeners
        this.cropConfirm.addEventListener('click', () => this.confirmCrop());
        this.cropCancel.addEventListener('click', () => this.cancelCrop());
        // Mouse events for crop
        this.cropOverlay.addEventListener('mousedown', (e) => this.onCropMouseDown(e));
        this.cropOverlay.addEventListener('mousemove', (e) => this.onCropMouseMove(e));
        this.cropOverlay.addEventListener('mouseup', () => this.onCropMouseUp());
        this.cropOverlay.addEventListener('mouseleave', () => this.onCropMouseUp());
        
        // Touch events for mobile crop
        this.cropOverlay.addEventListener('touchstart', (e) => this.onCropTouchStart(e));
        this.cropOverlay.addEventListener('touchmove', (e) => this.onCropTouchMove(e));
        this.cropOverlay.addEventListener('touchend', () => this.onCropTouchEnd());
        this.cropOverlay.addEventListener('touchcancel', () => this.onCropTouchEnd());
        
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
                this.loadNewImage();
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
                this.loadNewImage();
            }
        });
    }

    drawInitialCanvas() {
        // Main canvas
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = 'bold 24px Poppins, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🖼️ Choose an image to start', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        this.ctx.font = '16px Poppins, sans-serif';
        this.ctx.fillStyle = '#adb5bd';
        this.ctx.fillText('Upload any image and create your puzzle!', this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        // Preview canvas
        this.previewCtx.fillStyle = '#f8f9fa';
        this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.fillStyle = '#adb5bd';
        this.previewCtx.font = '14px Poppins, sans-serif';
        this.previewCtx.textAlign = 'center';
        this.previewCtx.textBaseline = 'middle';
        this.previewCtx.fillText('Preview', this.previewCanvas.width / 2, this.previewCanvas.height / 2);
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            this.isSelectingFile = false;
            return;
        }
        
        // Hide win message only when a file is actually selected
        this.winMessage.classList.add('hidden');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.isSelectingFile = false;
                this.showCropModal();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadNewImage() {
        if (this.isSelectingFile) {
            return;
        }
        this.isSelectingFile = true;
        this.imageInput.click();
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
        this.drawPuzzle(null, gridSize); // Initial draw
        this.drawPreview();
        this.shuffleBtn.disabled = false;
        this.enableGameButtons();
        
        // Show shuffle modal immediately
        this.showShuffleModal();
    }

    drawPuzzle(tiles, gridSize, animatingTiles = null, particles = null) {
        if (!this.image || !tiles) return;
        
        // Use animation-aware drawing if there are animations or particles
        if ((animatingTiles && animatingTiles.size > 0) || (particles && particles.length > 0)) {
            this.drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles);
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.tileSize = this.canvas.width / gridSize;
        const emptyIndex = gridSize * gridSize - 1;
        
        for (let i = 0; i < tiles.length; i++) {
            const tileNum = tiles[i];
            
            if (tileNum === emptyIndex) continue; // Skip empty tile
            
            const currentRow = Math.floor(i / gridSize);
            const currentCol = i % gridSize;
            const sourceRow = Math.floor(tileNum / gridSize);
            const sourceCol = tileNum % gridSize;
            
            // Draw tile image
            this.ctx.drawImage(
                this.image,
                sourceCol * this.tileSize, sourceRow * this.tileSize, this.tileSize, this.tileSize,
                currentCol * this.tileSize, currentRow * this.tileSize, this.tileSize, this.tileSize
            );
            
            // Draw tile border
            this.ctx.strokeStyle = '#dee2e6';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                currentCol * this.tileSize, currentRow * this.tileSize, this.tileSize, this.tileSize
            );
        }
        
        // Draw empty space
        const emptyPos = tiles.indexOf(emptyIndex);
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;
        
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(
            emptyCol * this.tileSize, emptyRow * this.tileSize, this.tileSize, this.tileSize
        );
        this.ctx.strokeStyle = '#adb5bd';
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            emptyCol * this.tileSize, emptyRow * this.tileSize, this.tileSize, this.tileSize
        );
        this.ctx.setLineDash([]);
    }

    drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.tileSize = this.canvas.width / gridSize;
        const emptyIndex = gridSize * gridSize - 1;
        
        // Draw empty space FIRST (so it doesn't cover animating tiles)
        const emptyPos = tiles.indexOf(emptyIndex);
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;
        
        // Only draw empty space if it's not the destination of an animating tile
        let drawEmptySpace = true;
        if (animatingTiles) {
            for (const [index, tileData] of animatingTiles) {
                const destRow = Math.floor(tileData.endY / this.tileSize);
                const destCol = Math.floor(tileData.endX / this.tileSize);
                if (destRow === emptyRow && destCol === emptyCol) {
                    drawEmptySpace = false;
                    break;
                }
            }
        }
        
        if (drawEmptySpace) {
            this.ctx.fillStyle = '#f8f9fa';
            this.ctx.fillRect(
                emptyCol * this.tileSize, emptyRow * this.tileSize, this.tileSize, this.tileSize
            );
            this.ctx.strokeStyle = '#adb5bd';
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(
                emptyCol * this.tileSize, emptyRow * this.tileSize, this.tileSize, this.tileSize
            );
            this.ctx.setLineDash([]);
        }
        
        // Draw static tiles
        for (let i = 0; i < tiles.length; i++) {
            const tileNum = tiles[i];
            
            if (tileNum === emptyIndex) continue;
            if (animatingTiles && animatingTiles.has(i)) continue; // Skip animating tiles
            
            const currentRow = Math.floor(i / gridSize);
            const currentCol = i % gridSize;
            const sourceRow = Math.floor(tileNum / gridSize);
            const sourceCol = tileNum % gridSize;
            
            this.ctx.drawImage(
                this.image,
                sourceCol * this.tileSize, sourceRow * this.tileSize, this.tileSize, this.tileSize,
                currentCol * this.tileSize, currentRow * this.tileSize, this.tileSize, this.tileSize
            );
            
            this.ctx.strokeStyle = '#dee2e6';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                currentCol * this.tileSize, currentRow * this.tileSize, this.tileSize, this.tileSize
            );
        }
        
        // Draw animating tiles ON TOP
        if (animatingTiles) {
            for (const [index, tileData] of animatingTiles) {
                const sourceRow = Math.floor(tileData.tileNumber / gridSize);
                const sourceCol = tileData.tileNumber % gridSize;
                
                // Add shadow effect for depth
                this.ctx.save();
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowOffsetY = 4;
                
                this.ctx.drawImage(
                    this.image,
                    sourceCol * this.tileSize, sourceRow * this.tileSize, this.tileSize, this.tileSize,
                    tileData.currentX, tileData.currentY, this.tileSize, this.tileSize
                );
                
                this.ctx.restore();
                
                // Animated border
                this.ctx.strokeStyle = '#667eea';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(
                    tileData.currentX, tileData.currentY, this.tileSize, this.tileSize
                );
            }
        }
        
        // Draw particles on top of everything
        if (particles) {
            this.updateAndDrawParticles(particles);
        }
    }

    drawPreview() {
        if (!this.image) return;
        
        // Clear and draw the complete image as preview
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.drawImage(this.image, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
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

    setDifficultyDisabled(disabled) {
        this.difficultySelect.disabled = disabled;
        if (disabled) {
            this.difficultySelect.classList.add('disabled-during-game');
        } else {
            this.difficultySelect.classList.remove('disabled-during-game');
        }
    }

    // Animation methods
    animateTileMove(fromIndex, toIndex, gridSize, tileNumber, callback) {
        const fromRow = Math.floor(fromIndex / gridSize);
        const fromCol = fromIndex % gridSize;
        const toRow = Math.floor(toIndex / gridSize);
        const toCol = toIndex % gridSize;
        
        const startX = fromCol * this.tileSize;
        const startY = fromRow * this.tileSize;
        const endX = toCol * this.tileSize;
        const endY = toRow * this.tileSize;
        
        const tileData = {
            tileNumber: tileNumber,
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            currentX: startX,
            currentY: startY,
            progress: 0,
            duration: 300, // ms
            startTime: Date.now()
        };
        
        this.animatingTiles.set(fromIndex, tileData);
        
        const animate = () => {
            const elapsed = Date.now() - tileData.startTime;
            tileData.progress = Math.min(elapsed / tileData.duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - tileData.progress, 3);
            
            tileData.currentX = tileData.startX + (tileData.endX - tileData.startX) * easeProgress;
            tileData.currentY = tileData.startY + (tileData.endY - tileData.startY) * easeProgress;
            
            // This will be called by main.js to redraw
            if (callback.onAnimationFrame) {
                callback.onAnimationFrame();
            }
            
            if (tileData.progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.animatingTiles.delete(fromIndex);
                if (callback.onComplete) {
                    callback.onComplete();
                }
            }
        };
        
        requestAnimationFrame(animate);
    }

    addClickEffect(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        // Create ripple particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push({
                x: canvasX,
                y: canvasY,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 1,
                maxLife: 30,
                size: 4,
                color: '#667eea',
                type: 'click'
            });
        }
    }

    startCelebration() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Create celebration particles
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        
        const createBurst = () => {
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;
                
                this.particles.push({
                    x: centerX + (Math.random() - 0.5) * 100,
                    y: centerY + (Math.random() - 0.5) * 100,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - Math.random() * 3,
                    life: 1,
                    maxLife: 120 + Math.random() * 60,
                    size: Math.random() * 8 + 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    gravity: 0.1,
                    type: 'celebration'
                });
            }
        };
        
        // Multiple bursts
        createBurst();
        setTimeout(createBurst, 200);
        setTimeout(createBurst, 500);
        setTimeout(createBurst, 800);
    }

    updateAndDrawParticles(particles) {
        this.ctx.save();
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // Update particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.gravity) {
                particle.vy += particle.gravity;
            }
            
            particle.life--;
            
            // Remove dead particles
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            // Draw particle
            const alpha = particle.life / particle.maxLife;
            
            if (particle.type === 'click') {
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (particle.type === 'celebration') {
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.save();
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.life * 0.1);
                
                // Draw star shape
                this.ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const angle = (j * Math.PI * 2) / 5;
                    const x1 = Math.cos(angle) * particle.size;
                    const y1 = Math.sin(angle) * particle.size;
                    const x2 = Math.cos(angle + Math.PI / 5) * particle.size * 0.5;
                    const y2 = Math.sin(angle + Math.PI / 5) * particle.size * 0.5;
                    
                    if (j === 0) {
                        this.ctx.moveTo(x1, y1);
                    } else {
                        this.ctx.lineTo(x1, y1);
                    }
                    this.ctx.lineTo(x2, y2);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        this.ctx.restore();
    }

    highlightTile(index, gridSize, className = 'tile-highlight') {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        this.ctx.save();
        
        if (className === 'next-move-highlight') {
            // Animated glow effect
            const time = Date.now() * 0.005;
            const intensity = (Math.sin(time) + 1) * 0.5;
            
            this.ctx.strokeStyle = '#ffc107';
            this.ctx.lineWidth = 6 + intensity * 3;
            this.ctx.shadowColor = '#ffc107';
            this.ctx.shadowBlur = 15 + intensity * 10;
            
            // Add sparkle particles
            if (Math.random() < 0.3) {
                const sparkleX = col * this.tileSize + Math.random() * this.tileSize;
                const sparkleY = row * this.tileSize + Math.random() * this.tileSize;
                
                this.particles.push({
                    x: sparkleX,
                    y: sparkleY,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1,
                    maxLife: 20,
                    size: 2,
                    color: '#ffc107',
                    type: 'click'
                });
            }
        } else {
            this.ctx.strokeStyle = '#28a745';
            this.ctx.lineWidth = 4;
        }
        
        this.ctx.strokeRect(
            col * this.tileSize + 3, row * this.tileSize + 3, 
            this.tileSize - 6, this.tileSize - 6
        );
        this.ctx.restore();
    }

    flashTile(index, gridSize, callback) {
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            if (flashCount % 2 === 0) {
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;
                
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
                this.ctx.fillRect(
                    col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize
                );
                this.ctx.restore();
            } else {
                if (callback) callback();
            }
            
            flashCount++;
            if (flashCount >= 6) {
                clearInterval(flashInterval);
                if (callback) callback();
            }
        }, 300);
    }

    drawCompleteImage() {
        if (!this.image) return;
        
        setTimeout(() => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
            this.particles = []; // Clear particles
        }, 5000);
    }

    // Crop functionality
    showCropModal() {
        if (!this.originalImage) return;
        
        this.cropModal.classList.remove('hidden');
        this.setupCropCanvas();
        this.initializeCropSelection();
    }

    setupCropCanvas() {
        const maxWidth = 600;
        const maxHeight = 400;
        
        let displayWidth = this.originalImage.width;
        let displayHeight = this.originalImage.height;
        
        // Scale down if too large
        const scale = Math.min(maxWidth / displayWidth, maxHeight / displayHeight, 1);
        displayWidth *= scale;
        displayHeight *= scale;
        
        this.cropCanvas.width = displayWidth;
        this.cropCanvas.height = displayHeight;
        this.cropState.canvasScale = displayWidth / this.originalImage.width;
        
        // Draw the image
        this.cropCtx.clearRect(0, 0, displayWidth, displayHeight);
        this.cropCtx.drawImage(this.originalImage, 0, 0, displayWidth, displayHeight);
        
        // Update overlay size
        this.cropOverlay.style.width = displayWidth + 'px';
        this.cropOverlay.style.height = displayHeight + 'px';
    }

    initializeCropSelection() {
        const canvasWidth = this.cropCanvas.width;
        const canvasHeight = this.cropCanvas.height;
        
        // Start with a centered square selection, smaller on mobile
        const isMobile = window.innerWidth <= 768;
        const sizeRatio = isMobile ? 0.7 : 0.6;
        const size = Math.min(canvasWidth, canvasHeight) * sizeRatio;
        
        this.cropState.cropWidth = size;
        this.cropState.cropHeight = size;
        this.cropState.cropX = Math.max(0, (canvasWidth - size) / 2);
        this.cropState.cropY = Math.max(0, (canvasHeight - size) / 2);
        
        // Ensure selection stays within bounds
        if (this.cropState.cropX + this.cropState.cropWidth > canvasWidth) {
            this.cropState.cropX = canvasWidth - this.cropState.cropWidth;
        }
        if (this.cropState.cropY + this.cropState.cropHeight > canvasHeight) {
            this.cropState.cropY = canvasHeight - this.cropState.cropHeight;
        }
        
        this.updateCropSelection();
    }

    updateCropSelection() {
        const { cropX, cropY, cropWidth, cropHeight } = this.cropState;
        
        this.cropSelection.style.left = cropX + 'px';
        this.cropSelection.style.top = cropY + 'px';
        this.cropSelection.style.width = cropWidth + 'px';
        this.cropSelection.style.height = cropHeight + 'px';
    }

    confirmCrop() {
        if (!this.originalImage) return;
        
        // Create cropped image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Calculate actual crop coordinates on original image
        const scale = 1 / this.cropState.canvasScale;
        const actualX = this.cropState.cropX * scale;
        const actualY = this.cropState.cropY * scale;
        const actualWidth = this.cropState.cropWidth * scale;
        const actualHeight = this.cropState.cropHeight * scale;
        
        // Make it square for puzzle
        const size = Math.min(actualWidth, actualHeight);
        tempCanvas.width = 400;
        tempCanvas.height = 400;
        
        tempCtx.drawImage(
            this.originalImage,
            actualX, actualY, size, size,
            0, 0, 400, 400
        );
        
        // Create new image from cropped data
        this.image = new Image();
        this.image.onload = () => {
            this.cropModal.classList.add('hidden');
            if (this.onImageSelected) {
                this.onImageSelected(this.image);
            }
        };
        this.image.src = tempCanvas.toDataURL();
    }

    cancelCrop() {
        this.cropModal.classList.add('hidden');
        this.imageInput.value = '';
        this.clearShuffleTimer();
    }

    // Shuffle Modal System
    showShuffleModal() {
        if (!this.image) return;
        
        // Draw preview in modal
        this.shufflePreviewCtx.clearRect(0, 0, this.shufflePreviewCanvas.width, this.shufflePreviewCanvas.height);
        this.shufflePreviewCtx.drawImage(this.image, 0, 0, this.shufflePreviewCanvas.width, this.shufflePreviewCanvas.height);
        
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
        // Always qualify if leaderboard has less than 50 entries
        if (this.leaderboard.length < 50) return true;
        
        // Check if this score is better than the worst score
        const sortedBoard = this.getSortedLeaderboard();
        const worstScore = sortedBoard[sortedBoard.length - 1];
        return this.compareScores(stats, worstScore) < 0;
    }

    compareScores(a, b) {
        // Primary: time (lower is better)
        if (a.time !== b.time) return a.time - b.time;
        // Secondary: moves (lower is better)
        if (a.moves !== b.moves) return a.moves - b.moves;
        // Tertiary: difficulty (higher is better)
        return b.difficulty - a.difficulty;
    }

    showPlayerNameModal(stats) {
        this.recordTimeEl.textContent = this.formatTime(stats.time);
        this.recordMovesEl.textContent = stats.moves;
        this.recordDifficultyEl.textContent = `${stats.difficulty}×${stats.difficulty}`;
        
        this.playerNameInput.value = this.playerName;
        this.playerNameModal.classList.remove('hidden');
        
        // Focus on input after animation
        setTimeout(() => this.playerNameInput.focus(), 300);
    }

    saveRecord() {
        const name = this.playerNameInput.value.trim() || 'Anonymous';
        
        // Save player name for future use
        this.playerName = name;
        localStorage.setItem('puzzlePlayerName', name);

        this.playerNameModal.classList.add('hidden');

        // Allow the orchestrator to persist the leaderboard record when available
        if (this.onRecordSave) {
            this.onRecordSave(name);
        }
    }

    skipRecord() {
        this.playerNameModal.classList.add('hidden');
    }

    showLeaderboard(highlightId = null) {
        this.leaderboardModal.classList.remove('hidden');
        this.renderLeaderboard('all', highlightId);
    }

    hideLeaderboard() {
        this.leaderboardModal.classList.add('hidden');
    }

    filterLeaderboard(difficulty) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });
        
        this.renderLeaderboard(difficulty);
    }

    renderLeaderboard(difficulty = 'all', highlightId = null) {
        let records = this.getSortedLeaderboard();
        
        // Filter by difficulty
        if (difficulty !== 'all') {
            records = records.filter(r => r.difficulty.toString() === difficulty);
        }
        
        if (records.length === 0) {
            this.leaderboardList.innerHTML = '<div class="no-records">No records for this difficulty yet!</div>';
            return;
        }
        
        const html = records.slice(0, 20).map((record, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankEmoji = `#${rank}`;
            
            if (rank === 1) {
                rankClass = 'gold';
                rankEmoji = '🥇';
            } else if (rank === 2) {
                rankClass = 'silver';
                rankEmoji = '🥈';
            } else if (rank === 3) {
                rankClass = 'bronze';
                rankEmoji = '🥉';
            }
            
            const isHighlight = highlightId && record.id === highlightId;
            const date = new Date(record.timestamp).toLocaleDateString();
            
            return `
                <div class="leaderboard-entry ${isHighlight ? 'highlight' : ''}">
                    <div class="rank ${rankClass}">${rankEmoji}</div>
                    <div class="player-info">
                        <div class="player-name">${this.escapeHtml(record.name)}</div>
                        <div class="player-stats">
                            <span class="stat-badge time-badge">${this.formatTime(record.time)}</span>
                            <span class="stat-badge moves-badge">${record.moves} moves</span>
                            <span class="stat-badge difficulty-badge">${record.difficulty}×${record.difficulty}</span>
                            <span class="stat-badge">${date}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.leaderboardList.innerHTML = html;
        
        // Scroll to highlighted entry
        if (highlightId) {
            setTimeout(() => {
                const highlighted = this.leaderboardList.querySelector('.highlight');
                if (highlighted) {
                    highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    getSortedLeaderboard() {
        return [...this.leaderboard].sort(this.compareScores.bind(this));
    }

    clearLeaderboard() {
        if (confirm('Are you sure you want to clear all leaderboard records? This cannot be undone!')) {
            this.leaderboard = [];
            localStorage.removeItem('puzzleLeaderboard');
            this.renderLeaderboard('all');
            this.updateUserRank();
        }
    }

    updateUserRank() {
        if (!this.playerName || this.leaderboard.length === 0) {
            this.userRankEl.textContent = '#--';
            return;
        }
        
        // Find user's best score
        const userRecords = this.leaderboard.filter(r => r.name === this.playerName);
        if (userRecords.length === 0) {
            this.userRankEl.textContent = '#--';
            return;
        }
        
        const bestUserRecord = userRecords.sort(this.compareScores.bind(this))[0];
        const sortedBoard = this.getSortedLeaderboard();
        const rank = sortedBoard.findIndex(r => r.id === bestUserRecord.id) + 1;
        
        this.userRankEl.textContent = rank > 0 ? `#${rank}` : '#--';
    }

    addToLeaderboard(record) {
        this.leaderboard.push(record);
        
        // Keep only top 50 scores
        this.leaderboard = this.getSortedLeaderboard().slice(0, 50);
        
        // Save to localStorage
        localStorage.setItem('puzzleLeaderboard', JSON.stringify(this.leaderboard));
        
        this.updateUserRank();
        
        // Show success message
        this.showLeaderboard(record.id);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Crop mouse/touch handlers
    onCropMouseDown(e) {
        e.preventDefault();
        const rect = this.cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.cropState.startX = x;
        this.cropState.startY = y;
        this.cropState.startCropX = this.cropState.cropX;
        this.cropState.startCropY = this.cropState.cropY;
        this.cropState.startCropWidth = this.cropState.cropWidth;
        this.cropState.startCropHeight = this.cropState.cropHeight;
        
        // Check if clicking on a handle
        const handle = this.getHandleAtPosition(x, y);
        if (handle) {
            this.cropState.isResizing = true;
            this.cropState.dragHandle = handle;
        } else if (this.isInsideCropArea(x, y)) {
            this.cropState.isDragging = true;
        } else {
            // Start new selection
            this.cropState.cropX = x;
            this.cropState.cropY = y;
            this.cropState.cropWidth = 0;
            this.cropState.cropHeight = 0;
            this.cropState.isDragging = true;
            this.updateCropSelection();
        }
    }

    onCropMouseMove(e) {
        if (!this.cropState.isDragging && !this.cropState.isResizing) return;
        
        const rect = this.cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const deltaX = x - this.cropState.startX;
        const deltaY = y - this.cropState.startY;
        
        if (this.cropState.isDragging && !this.cropState.isResizing) {
            // Move the selection
            this.cropState.cropX = Math.max(0, Math.min(
                this.cropCanvas.width - this.cropState.cropWidth,
                this.cropState.startCropX + deltaX
            ));
            this.cropState.cropY = Math.max(0, Math.min(
                this.cropCanvas.height - this.cropState.cropHeight,
                this.cropState.startCropY + deltaY
            ));
        } else if (this.cropState.isResizing) {
            // Resize the selection
            this.resizeCropSelection(deltaX, deltaY);
        }
        
        this.updateCropSelection();
    }

    onCropMouseUp() {
        this.cropState.isDragging = false;
        this.cropState.isResizing = false;
        this.cropState.dragHandle = null;
    }

    getHandleAtPosition(x, y, customTolerance = null) {
        const { cropX, cropY, cropWidth, cropHeight } = this.cropState;
        const tolerance = customTolerance || 15;
        
        const handles = {
            'nw': { x: cropX, y: cropY },
            'ne': { x: cropX + cropWidth, y: cropY },
            'sw': { x: cropX, y: cropY + cropHeight },
            'se': { x: cropX + cropWidth, y: cropY + cropHeight },
            'n': { x: cropX + cropWidth / 2, y: cropY },
            's': { x: cropX + cropWidth / 2, y: cropY + cropHeight },
            'w': { x: cropX, y: cropY + cropHeight / 2 },
            'e': { x: cropX + cropWidth, y: cropY + cropHeight / 2 }
        };
        
        for (const [handle, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) < tolerance && Math.abs(y - pos.y) < tolerance) {
                return handle;
            }
        }
        
        return null;
    }

    isInsideCropArea(x, y) {
        const { cropX, cropY, cropWidth, cropHeight } = this.cropState;
        return x >= cropX && x <= cropX + cropWidth && 
               y >= cropY && y <= cropY + cropHeight;
    }

    resizeCropSelection(deltaX, deltaY) {
        const handle = this.cropState.dragHandle;
        const { startCropX, startCropY, startCropWidth, startCropHeight } = this.cropState;
        const minSize = 50;
        
        switch (handle) {
            case 'nw':
                this.cropState.cropX = Math.max(0, startCropX + deltaX);
                this.cropState.cropY = Math.max(0, startCropY + deltaY);
                this.cropState.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                this.cropState.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 'ne':
                this.cropState.cropY = Math.max(0, startCropY + deltaY);
                this.cropState.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                this.cropState.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 'sw':
                this.cropState.cropX = Math.max(0, startCropX + deltaX);
                this.cropState.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                this.cropState.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'se':
                this.cropState.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                this.cropState.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'n':
                this.cropState.cropY = Math.max(0, startCropY + deltaY);
                this.cropState.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 's':
                this.cropState.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'w':
                this.cropState.cropX = Math.max(0, startCropX + deltaX);
                this.cropState.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                break;
            case 'e':
                this.cropState.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                break;
        }
        
        // Ensure crop area stays within canvas bounds
        this.cropState.cropX = Math.max(0, Math.min(
            this.cropCanvas.width - this.cropState.cropWidth, this.cropState.cropX
        ));
        this.cropState.cropY = Math.max(0, Math.min(
            this.cropCanvas.height - this.cropState.cropHeight, this.cropState.cropY
        ));
        this.cropState.cropWidth = Math.min(
            this.cropCanvas.width - this.cropState.cropX, this.cropState.cropWidth
        );
        this.cropState.cropHeight = Math.min(
            this.cropCanvas.height - this.cropState.cropY, this.cropState.cropHeight
        );
    }

    // Touch event handlers for mobile crop functionality
    onCropTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.cropOverlay.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Use the same logic as mouse down
        this.cropState.startX = x;
        this.cropState.startY = y;
        this.cropState.startCropX = this.cropState.cropX;
        this.cropState.startCropY = this.cropState.cropY;
        this.cropState.startCropWidth = this.cropState.cropWidth;
        this.cropState.startCropHeight = this.cropState.cropHeight;
        
        // Check if touching a handle (with larger tolerance for touch)
        const handle = this.getHandleAtPosition(x, y, 25);
        if (handle) {
            this.cropState.isResizing = true;
            this.cropState.dragHandle = handle;
        } else if (this.isInsideCropArea(x, y)) {
            this.cropState.isDragging = true;
        } else {
            // Start new selection
            this.cropState.cropX = x;
            this.cropState.cropY = y;
            this.cropState.cropWidth = 0;
            this.cropState.cropHeight = 0;
            this.cropState.isDragging = true;
            this.updateCropSelection();
        }
    }

    onCropTouchMove(e) {
        e.preventDefault();
        if (!this.cropState.isDragging && !this.cropState.isResizing) return;
        
        const touch = e.touches[0];
        const rect = this.cropOverlay.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const deltaX = x - this.cropState.startX;
        const deltaY = y - this.cropState.startY;
        
        if (this.cropState.isDragging && !this.cropState.isResizing) {
            // Move the selection
            this.cropState.cropX = Math.max(0, Math.min(
                this.cropCanvas.width - this.cropState.cropWidth,
                this.cropState.startCropX + deltaX
            ));
            this.cropState.cropY = Math.max(0, Math.min(
                this.cropCanvas.height - this.cropState.cropHeight,
                this.cropState.startCropY + deltaY
            ));
        } else if (this.cropState.isResizing) {
            // Resize the selection
            this.resizeCropSelection(deltaX, deltaY);
        }
        
        this.updateCropSelection();
    }

    onCropTouchEnd() {
        this.cropState.isDragging = false;
        this.cropState.isResizing = false;
        this.cropState.dragHandle = null;
    }
}