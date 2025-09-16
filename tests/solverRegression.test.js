import assert from 'node:assert/strict';

if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map();
    globalThis.localStorage = {
        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
            storage.set(key, String(value));
        },
        removeItem(key) {
            storage.delete(key);
        },
        clear() {
            storage.clear();
        }
    };
}

const { GameState } = await import('../src/game.js');

function getGoalState(gridSize) {
    return Array.from({ length: gridSize * gridSize }, (_, i) => i);
}

function getValidMoves(emptyPos, gridSize) {
    const moves = [];
    const row = Math.floor(emptyPos / gridSize);
    const col = emptyPos % gridSize;

    if (row > 0) moves.push(emptyPos - gridSize);
    if (row < gridSize - 1) moves.push(emptyPos + gridSize);
    if (col > 0) moves.push(emptyPos - 1);
    if (col < gridSize - 1) moves.push(emptyPos + 1);

    return moves;
}

function applyMovesToTiles(startTiles, moves, gridSize, emptyValue) {
    const tiles = [...startTiles];

    for (const move of moves) {
        const emptyPos = tiles.indexOf(emptyValue);
        const validMoves = getValidMoves(emptyPos, gridSize);
        assert(
            validMoves.includes(move),
            `Move ${move} is invalid for current empty position ${emptyPos}`
        );

        [tiles[emptyPos], tiles[move]] = [tiles[move], tiles[emptyPos]];
    }

    return tiles;
}

function scrambleFromMoves(gridSize, scrambleMoves) {
    const emptyValue = gridSize * gridSize - 1;
    const start = getGoalState(gridSize);
    return applyMovesToTiles(start, scrambleMoves, gridSize, emptyValue);
}

const scrambleScenarios = [
    {
        description: 'solves a four-move 2×2 shuffle',
        gridSize: 2,
        scrambleMoves: [2, 0, 1, 3]
    },
    {
        description: 'solves a layered loop on 3×3 board',
        gridSize: 3,
        scrambleMoves: [5, 2, 1, 4, 7, 8, 5, 4, 3, 0, 1, 2, 5, 8]
    },
    {
        description: 'solves a perimeter cycle on 4×4 board',
        gridSize: 4,
        scrambleMoves: [11, 10, 6, 2, 1, 0, 4, 8, 12, 13, 14, 15]
    }
];

for (const scenario of scrambleScenarios) {
    const game = new GameState();
    game.setupGame(scenario.gridSize);

    const scrambledTiles = scrambleFromMoves(scenario.gridSize, scenario.scrambleMoves);
    game.tiles = scrambledTiles;

    const solution = game.findSolution();

    assert(
        Array.isArray(solution) && solution.length > 0,
        `Expected a non-empty solution for scenario: ${scenario.description}`
    );

    assert(
        solution.length <= scenario.scrambleMoves.length,
        `Solver returned longer path than original scramble for: ${scenario.description}`
    );

    const finalTiles = applyMovesToTiles(
        scrambledTiles,
        solution,
        scenario.gridSize,
        game.emptyIndex
    );

    assert.deepStrictEqual(
        finalTiles,
        getGoalState(scenario.gridSize),
        `Solution should resolve the puzzle for: ${scenario.description}`
    );
}

{
    const game = new GameState();
    game.setupGame(3);
    game.tiles = getGoalState(3);

    const solution = game.findSolution();
    assert(Array.isArray(solution), 'Solved puzzle should return an array');
    assert.strictEqual(solution.length, 0, 'Solved puzzle should require zero moves');
}

{
    const game = new GameState();
    game.setupGame(3);
    // Swap two adjacent tiles to create an unsolvable state
    game.tiles = [0, 2, 1, 3, 4, 5, 6, 7, 8];

    const solution = game.findSolution();
    assert.strictEqual(solution, null, 'Unsolvable puzzle should return null');
}

console.log('Solver regression scenarios completed successfully.');
