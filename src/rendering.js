export class PuzzleRenderer {
    constructor(ui) {
        this.ui = ui;
    }

    drawInitialCanvas() {
        const { canvas, ctx, previewCanvas, previewCtx } = this.ui;
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#6c757d';
        ctx.font = 'bold 24px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🖼️ Choose an image to start', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px Poppins, sans-serif';
        ctx.fillStyle = '#adb5bd';
        ctx.fillText('Upload any image and create your puzzle!', canvas.width / 2, canvas.height / 2 + 20);

        previewCtx.fillStyle = '#f8f9fa';
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.fillStyle = '#adb5bd';
        previewCtx.font = '14px Poppins, sans-serif';
        previewCtx.textAlign = 'center';
        previewCtx.textBaseline = 'middle';
        previewCtx.fillText('Preview', previewCanvas.width / 2, previewCanvas.height / 2);
    }

    drawPuzzle(tiles, gridSize, animatingTiles = null, particles = null) {
        const { image, ctx, canvas } = this.ui;
        if (!image || !tiles) return;

        if ((animatingTiles && animatingTiles.size > 0) || (particles && particles.length > 0)) {
            this.drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tileSize = canvas.width / gridSize;
        this.ui.tileSize = tileSize;
        const emptyIndex = gridSize * gridSize - 1;

        for (let i = 0; i < tiles.length; i++) {
            const tileNum = tiles[i];
            if (tileNum === emptyIndex) continue;

            const currentRow = Math.floor(i / gridSize);
            const currentCol = i % gridSize;
            const sourceRow = Math.floor(tileNum / gridSize);
            const sourceCol = tileNum % gridSize;

            ctx.drawImage(
                image,
                sourceCol * tileSize, sourceRow * tileSize, tileSize, tileSize,
                currentCol * tileSize, currentRow * tileSize, tileSize, tileSize
            );

            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                currentCol * tileSize, currentRow * tileSize, tileSize, tileSize
            );
        }

        const emptyPos = tiles.indexOf(emptyIndex);
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(
            emptyCol * tileSize, emptyRow * tileSize, tileSize, tileSize
        );
        ctx.strokeStyle = '#adb5bd';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            emptyCol * tileSize, emptyRow * tileSize, tileSize, tileSize
        );
        ctx.setLineDash([]);
    }

    drawPuzzleWithAnimations(tiles, gridSize, animatingTiles, particles) {
        const { ctx, canvas, image } = this.ui;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tileSize = canvas.width / gridSize;
        this.ui.tileSize = tileSize;
        const emptyIndex = gridSize * gridSize - 1;

        const emptyPos = tiles.indexOf(emptyIndex);
        const emptyRow = Math.floor(emptyPos / gridSize);
        const emptyCol = emptyPos % gridSize;

        let drawEmptySpace = true;
        if (animatingTiles) {
            for (const [, tileData] of animatingTiles) {
                const destRow = Math.floor(tileData.endY / tileSize);
                const destCol = Math.floor(tileData.endX / tileSize);
                if (destRow === emptyRow && destCol === emptyCol) {
                    drawEmptySpace = false;
                    break;
                }
            }
        }

        if (drawEmptySpace) {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(
                emptyCol * tileSize, emptyRow * tileSize, tileSize, tileSize
            );
            ctx.strokeStyle = '#adb5bd';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                emptyCol * tileSize, emptyRow * tileSize, tileSize, tileSize
            );
            ctx.setLineDash([]);
        }

        for (let i = 0; i < tiles.length; i++) {
            const tileNum = tiles[i];
            if (tileNum === emptyIndex) continue;
            if (animatingTiles && animatingTiles.has(i)) continue;

            const currentRow = Math.floor(i / gridSize);
            const currentCol = i % gridSize;
            const sourceRow = Math.floor(tileNum / gridSize);
            const sourceCol = tileNum % gridSize;

            ctx.drawImage(
                image,
                sourceCol * tileSize, sourceRow * tileSize, tileSize, tileSize,
                currentCol * tileSize, currentRow * tileSize, tileSize, tileSize
            );

            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                currentCol * tileSize, currentRow * tileSize, tileSize, tileSize
            );
        }

        if (animatingTiles) {
            for (const [, tileData] of animatingTiles) {
                const sourceRow = Math.floor(tileData.tileNumber / gridSize);
                const sourceCol = tileData.tileNumber % gridSize;

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 4;

                ctx.drawImage(
                    image,
                    sourceCol * tileSize, sourceRow * tileSize, tileSize, tileSize,
                    tileData.currentX, tileData.currentY, tileSize, tileSize
                );

                ctx.restore();

                ctx.strokeStyle = '#667eea';
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    tileData.currentX, tileData.currentY, tileSize, tileSize
                );
            }
        }

        if (particles) {
            this.updateAndDrawParticles(particles);
        }
    }

    drawPreview() {
        if (!this.ui.image) return;
        const { previewCtx, previewCanvas, image } = this.ui;
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);
    }

    animateTileMove(fromIndex, toIndex, gridSize, tileNumber, callback) {
        const tileSize = this.ui.canvas.width / gridSize;
        this.ui.tileSize = tileSize;

        const fromRow = Math.floor(fromIndex / gridSize);
        const fromCol = fromIndex % gridSize;
        const toRow = Math.floor(toIndex / gridSize);
        const toCol = toIndex % gridSize;

        const startX = fromCol * tileSize;
        const startY = fromRow * tileSize;
        const endX = toCol * tileSize;
        const endY = toRow * tileSize;

        const tileData = {
            tileNumber,
            startX,
            startY,
            endX,
            endY,
            currentX: startX,
            currentY: startY,
            progress: 0,
            duration: 300,
            startTime: Date.now()
        };

        this.ui.animatingTiles.set(fromIndex, tileData);

        const animate = () => {
            const elapsed = Date.now() - tileData.startTime;
            tileData.progress = Math.min(elapsed / tileData.duration, 1);
            const easeProgress = 1 - Math.pow(1 - tileData.progress, 3);

            tileData.currentX = tileData.startX + (tileData.endX - tileData.startX) * easeProgress;
            tileData.currentY = tileData.startY + (tileData.endY - tileData.startY) * easeProgress;

            if (callback.onAnimationFrame) {
                callback.onAnimationFrame();
            }

            if (tileData.progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.ui.animatingTiles.delete(fromIndex);
                if (callback.onComplete) {
                    callback.onComplete();
                }
            }
        };

        requestAnimationFrame(animate);
    }

    addClickEffect(x, y) {
        const rect = this.ui.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.ui.particles.push({
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
        const centerX = this.ui.canvas.width / 2;
        const centerY = this.ui.canvas.height / 2;
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

        const createBurst = () => {
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;

                this.ui.particles.push({
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

        createBurst();
        setTimeout(createBurst, 200);
        setTimeout(createBurst, 500);
        setTimeout(createBurst, 800);
    }

    updateAndDrawParticles(particles) {
        const { ctx } = this.ui;
        ctx.save();

        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.gravity) {
                particle.vy += particle.gravity;
            }

            particle.life--;

            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            const alpha = particle.life / particle.maxLife;

            if (particle.type === 'click') {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            } else if (particle.type === 'celebration') {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.life * 0.1);

                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const angle = (j * Math.PI * 2) / 5;
                    const x1 = Math.cos(angle) * particle.size;
                    const y1 = Math.sin(angle) * particle.size;
                    const x2 = Math.cos(angle + Math.PI / 5) * particle.size * 0.5;
                    const y2 = Math.sin(angle + Math.PI / 5) * particle.size * 0.5;

                    if (j === 0) {
                        ctx.moveTo(x1, y1);
                    } else {
                        ctx.lineTo(x1, y1);
                    }
                    ctx.lineTo(x2, y2);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();
    }

    highlightTile(index, gridSize, className = 'tile-highlight') {
        const tileSize = this.ui.tileSize || (this.ui.canvas.width / gridSize);
        this.ui.tileSize = tileSize;
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const { ctx } = this.ui;
        ctx.save();

        if (className === 'next-move-highlight') {
            const time = Date.now() * 0.005;
            const intensity = (Math.sin(time) + 1) * 0.5;

            ctx.strokeStyle = '#ffc107';
            ctx.lineWidth = 6 + intensity * 3;
            ctx.shadowColor = '#ffc107';
            ctx.shadowBlur = 15 + intensity * 10;

            if (Math.random() < 0.3) {
                const sparkleX = col * tileSize + Math.random() * tileSize;
                const sparkleY = row * tileSize + Math.random() * tileSize;

                this.ui.particles.push({
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
            ctx.strokeStyle = '#28a745';
            ctx.lineWidth = 4;
        }

        ctx.strokeRect(
            col * tileSize + 3, row * tileSize + 3,
            tileSize - 6, tileSize - 6
        );
        ctx.restore();
    }

    flashTile(index, gridSize, callback) {
        const tileSize = this.ui.tileSize || (this.ui.canvas.width / gridSize);
        this.ui.tileSize = tileSize;
        let flashCount = 0;

        const flashInterval = setInterval(() => {
            if (flashCount % 2 === 0) {
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;

                this.ui.ctx.save();
                this.ui.ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
                this.ui.ctx.fillRect(
                    col * tileSize, row * tileSize, tileSize, tileSize
                );
                this.ui.ctx.restore();
            } else if (callback) {
                callback();
            }

            flashCount++;
            if (flashCount >= 6) {
                clearInterval(flashInterval);
                if (callback) callback();
            }
        }, 300);
    }

    drawCompleteImage() {
        if (!this.ui.image) return;

        setTimeout(() => {
            this.ui.ctx.clearRect(0, 0, this.ui.canvas.width, this.ui.canvas.height);
            this.ui.ctx.drawImage(this.ui.image, 0, 0, this.ui.canvas.width, this.ui.canvas.height);
            this.ui.particles = [];
        }, 5000);
    }
}
