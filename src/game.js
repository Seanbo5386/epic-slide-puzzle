export class GameState {
    constructor() {
        this.tiles = [];
        this.gridSize = 3;
        this.emptyIndex = 0;
        this.moveCount = 0;
        this.startTime = 0;
        this.isGameActive = false;
        const storedBestTimes = localStorage.getItem('puzzleBestTimes');
        try {
            this.bestTimes = storedBestTimes ? JSON.parse(storedBestTimes) : {};
        } catch (error) {
            console.warn('Failed to parse puzzle best times; using defaults.', error);
            this.bestTimes = {};
        }
        this.isSolving = false;
        this.solveMoves = [];
        this.currentSolveStep = 0;
        this.lastGameStats = null;
    }

    setupGame(gridSize) {
        this.gridSize = gridSize;
        this.tiles = [];
        this.emptyIndex = this.gridSize * this.gridSize - 1;
        
        // Create tiles array
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            this.tiles.push(i);
        }
    }

    shufflePuzzle() {
        // Fisher-Yates shuffle, but ensure it's solvable
        let attempts = 0;
        do {
            // Reset to solved state
            for (let i = 0; i < this.tiles.length; i++) {
                this.tiles[i] = i;
            }
            
            // Perform random swaps
            const numShuffles = Math.max(100, this.gridSize * this.gridSize * 10);
            for (let i = 0; i < numShuffles; i++) {
                const emptyPos = this.tiles.indexOf(this.emptyIndex);
                const neighbors = this.getValidMoves(emptyPos);
                if (neighbors.length > 0) {
                    const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.swapTiles(emptyPos, randomNeighbor);
                }
            }
            attempts++;
        } while (this.isSolved() && attempts < 10);
    }

    getValidMoves(emptyPos) {
        const moves = [];
        const row = Math.floor(emptyPos / this.gridSize);
        const col = emptyPos % this.gridSize;
        
        // Up
        if (row > 0) moves.push(emptyPos - this.gridSize);
        // Down  
        if (row < this.gridSize - 1) moves.push(emptyPos + this.gridSize);
        // Left
        if (col > 0) moves.push(emptyPos - 1);
        // Right
        if (col < this.gridSize - 1) moves.push(emptyPos + 1);
        
        return moves;
    }

    canMoveTile(index) {
        const emptyPos = this.tiles.indexOf(this.emptyIndex);
        const emptyRow = Math.floor(emptyPos / this.gridSize);
        const emptyCol = emptyPos % this.gridSize;
        const tileRow = Math.floor(index / this.gridSize);
        const tileCol = index % this.gridSize;
        
        const rowDiff = Math.abs(emptyRow - tileRow);
        const colDiff = Math.abs(emptyCol - tileCol);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    swapTiles(index1, index2) {
        [this.tiles[index1], this.tiles[index2]] = [this.tiles[index2], this.tiles[index1]];
    }

    isSolved() {
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.tiles[i] !== i) return false;
        }
        return true;
    }

    makeMove(clickedIndex) {
        if (!this.canMoveTile(clickedIndex)) return false;
        
        const emptyPos = this.tiles.indexOf(this.emptyIndex);
        this.swapTiles(clickedIndex, emptyPos);
        this.moveCount++;
        
        return true;
    }

    startGame() {
        this.moveCount = 0;
        this.startTime = Date.now();
        this.isGameActive = true;
        
        this.shufflePuzzle();
        
    }

    endGame() {
        this.isGameActive = false;

        const endTime = Date.now();
        const totalTime = Math.floor((endTime - this.startTime) / 1000);
        
        // Save best time
        this.saveBestTime(totalTime);
        
        // Store game stats
        this.lastGameStats = {
            time: totalTime,
            moves: this.moveCount,
            difficulty: this.gridSize,
            timestamp: Date.now()
        };
        
        return this.lastGameStats;
    }

    saveBestTime(time) {
        const difficulty = `${this.gridSize}x${this.gridSize}`;
        if (!this.bestTimes[difficulty] || time < this.bestTimes[difficulty]) {
            this.bestTimes[difficulty] = time;
            localStorage.setItem('puzzleBestTimes', JSON.stringify(this.bestTimes));
        }
    }

    getBestTime() {
        const difficulty = `${this.gridSize}x${this.gridSize}`;
        return this.bestTimes[difficulty] || null;
    }

    updateTimer() {
        // This will be handled by UI, but we keep the method for consistency
        if (!this.isGameActive) return;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Auto-solve functionality
    findSolution() {
        // For any size puzzle, use a simplified approach that's more reliable
        return this.getHelpfulMoves();
    }

    getHelpfulMoves() {
        // Generate a sequence of helpful moves without modifying the actual game state
        const moves = [];
        const maxMoves = Math.min(15, this.gridSize * this.gridSize * 2);
        
        // Work with a copy of the tiles
        const workingTiles = [...this.tiles];
        const targetState = Array.from({ length: this.gridSize * this.gridSize }, (_, i) => i);
        
        for (let attempt = 0; attempt < maxMoves; attempt++) {
            const emptyPos = workingTiles.indexOf(this.emptyIndex);
            const validMoves = this.getValidMovesForState(workingTiles, emptyPos);
            
            if (validMoves.length === 0) break;
            
            // Find the move that gets us closer to the solution
            let bestMove = validMoves[0];
            let bestScore = this.calculateScoreForState(workingTiles);
            
            for (const move of validMoves) {
                // Test the move on a copy
                const testTiles = [...workingTiles];
                [testTiles[emptyPos], testTiles[move]] = [testTiles[move], testTiles[emptyPos]];
                
                const newScore = this.calculateScoreForState(testTiles);
                
                if (newScore < bestScore) {
                    bestScore = newScore;
                    bestMove = move;
                }
            }
            
            moves.push(bestMove);
            
            // Apply the best move to working tiles
            [workingTiles[emptyPos], workingTiles[bestMove]] = [workingTiles[bestMove], workingTiles[emptyPos]];
            
            // Check if solved
            if (this.arraysEqual(workingTiles, targetState)) {
                break;
            }
        }
        
        return moves;
    }
    
    getValidMovesForState(tiles, emptyPos) {
        const moves = [];
        const row = Math.floor(emptyPos / this.gridSize);
        const col = emptyPos % this.gridSize;
        
        // Up
        if (row > 0) moves.push(emptyPos - this.gridSize);
        // Down  
        if (row < this.gridSize - 1) moves.push(emptyPos + this.gridSize);
        // Left
        if (col > 0) moves.push(emptyPos - 1);
        // Right
        if (col < this.gridSize - 1) moves.push(emptyPos + 1);
        
        return moves;
    }
    
    calculatePuzzleScore() {
        return this.calculateScoreForState(this.tiles);
    }
    
    calculateScoreForState(tiles) {
        // Calculate how "wrong" the current state is (lower is better)
        let score = 0;
        for (let i = 0; i < tiles.length; i++) {
            if (tiles[i] !== i && tiles[i] !== this.emptyIndex) {
                // Add Manhattan distance for misplaced tiles
                const currentRow = Math.floor(i / this.gridSize);
                const currentCol = i % this.gridSize;
                const correctRow = Math.floor(tiles[i] / this.gridSize);
                const correctCol = tiles[i] % this.gridSize;
                
                score += Math.abs(currentRow - correctRow) + Math.abs(currentCol - correctCol);
            }
        }
        return score;
    }

    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, i) => val === b[i]);
    }

    findNextBestMove() {
        const emptyPos = this.tiles.indexOf(this.emptyIndex);
        const validMoves = this.getValidMoves(emptyPos);
        
        // Find the move that puts a tile closer to its correct position
        let bestMove = -1;
        let bestScore = -1;
        
        for (const move of validMoves) {
            const tileNum = this.tiles[move];
            const correctPos = tileNum;
            const distance = this.getManhattanDistance(move, correctPos);
            const newDistance = this.getManhattanDistance(emptyPos, correctPos);
            
            if (newDistance < distance && newDistance < bestScore || bestScore === -1) {
                bestScore = newDistance;
                bestMove = move;
            }
        }
        
        return bestMove !== -1 ? bestMove : (validMoves.length > 0 ? validMoves[0] : -1);
    }

    getManhattanDistance(pos1, pos2) {
        const row1 = Math.floor(pos1 / this.gridSize);
        const col1 = pos1 % this.gridSize;
        const row2 = Math.floor(pos2 / this.gridSize);
        const col2 = pos2 % this.gridSize;
        
        return Math.abs(row1 - row2) + Math.abs(col1 - col2);
    }

    getWrongTiles() {
        const wrongTiles = [];
        for (let i = 0; i < this.tiles.length - 1; i++) { // -1 to exclude empty tile
            if (this.tiles[i] !== i) {
                wrongTiles.push(i);
            }
        }
        return wrongTiles;
    }
}