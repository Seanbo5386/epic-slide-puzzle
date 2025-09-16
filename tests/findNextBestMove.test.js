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

function getImprovingMoves(game) {
    const emptyPos = game.tiles.indexOf(game.emptyIndex);
    return game.getValidMoves(emptyPos).filter((move) => {
        const tileNum = game.tiles[move];
        const correctPos = tileNum;
        const currentDistance = game.getManhattanDistance(move, correctPos);
        const newDistance = game.getManhattanDistance(emptyPos, correctPos);
        return newDistance < currentDistance;
    });
}

function getDistancesForMove(game, move) {
    const tileNum = game.tiles[move];
    const correctPos = tileNum;
    const emptyPos = game.tiles.indexOf(game.emptyIndex);
    return {
        before: game.getManhattanDistance(move, correctPos),
        after: game.getManhattanDistance(emptyPos, correctPos)
    };
}

const scenarios = [
    {
        description: 'prefers moving tile closer when adjacent tile is already solved',
        tiles: [0, 7, 2, 3, 4, 5, 6, 8, 1],
        expectedMove: 8
    },
    {
        description: 'selects a reducing move when multiple candidates are available',
        tiles: [0, 6, 2, 7, 8, 5, 1, 3, 4]
    }
];

for (const { description, tiles, expectedMove } of scenarios) {
    const game = new GameState();
    game.setupGame(3);
    game.tiles = tiles;

    const improvingMoves = getImprovingMoves(game);
    const chosenMove = game.findNextBestMove();

    if (expectedMove !== undefined) {
        assert.strictEqual(
            chosenMove,
            expectedMove,
            `Unexpected move selected for scenario: ${description}`
        );
    }

    if (improvingMoves.length > 0) {
        assert(
            improvingMoves.includes(chosenMove),
            `Selected move should reduce distance when possible: ${description}`
        );

        const { before, after } = getDistancesForMove(game, chosenMove);
        assert(
            after < before,
            `Selected move must reduce Manhattan distance: ${description}`
        );
    } else {
        const emptyPos = game.tiles.indexOf(game.emptyIndex);
        const validMoves = game.getValidMoves(emptyPos);
        assert.strictEqual(
            chosenMove,
            validMoves[0] ?? -1,
            `When no improvement exists, should fall back to first valid move: ${description}`
        );
    }
}

console.log('All findNextBestMove scenarios passed.');
