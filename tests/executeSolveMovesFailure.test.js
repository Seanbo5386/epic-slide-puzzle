import assert from 'node:assert/strict';

if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        addEventListener() {
            // No-op for tests
        }
    };
}

const originalSetTimeout = globalThis.setTimeout;
const scheduledTimeouts = [];
globalThis.setTimeout = (fn, delay) => {
    scheduledTimeouts.push({ fn, delay });
    return scheduledTimeouts.length;
};

try {
    const { SlidePuzzle } = await import('../src/main.js');

    const originalTiles = [1, 0, 2, 3, 4, 5, 6, 7, 8];
    const mutatedTiles = [1, 2, 0, 3, 4, 5, 6, 7, 8];

    const puzzleStub = {
        game: {
            currentSolveStep: 0,
            solveMoves: [],
            tiles: [...mutatedTiles],
            gridSize: 3,
            emptyIndex: 8,
            isSolving: true,
            moveCount: 12,
            isSolved() {
                return false;
            }
        },
        ui: {
            autoSolveBtn: {
                textContent: '🔄 Solving...',
                disabled: true
            },
            drawCalls: [],
            drawPuzzle(tiles, gridSize) {
                this.drawCalls.push({ tiles: [...tiles], gridSize });
            },
            enableGameButtonsCalled: false,
            enableGameButtons() {
                this.enableGameButtonsCalled = true;
            },
            updateMoveCountCalledWith: undefined,
            updateMoveCount(value) {
                this.updateMoveCountCalledWith = value;
            },
            setDifficultyDisabledCalled: false,
            setDifficultyDisabled(value) {
                this.setDifficultyDisabledCalled = value;
            }
        },
        originalGameState: [...originalTiles],
        originalMoveCount: 3
    };

    Object.setPrototypeOf(puzzleStub, SlidePuzzle.prototype);

    SlidePuzzle.prototype.executeSolveMoves.call(puzzleStub);

    assert.deepEqual(
        puzzleStub.game.tiles,
        originalTiles,
        'Tiles should be restored to the saved original state.'
    );

    assert.strictEqual(
        puzzleStub.ui.drawCalls.length > 0,
        true,
        'drawPuzzle should be invoked to redraw the restored board.'
    );

    const { tiles: renderedTiles } = puzzleStub.ui.drawCalls[puzzleStub.ui.drawCalls.length - 1];
    assert.deepEqual(
        renderedTiles,
        originalTiles,
        'drawPuzzle should render the restored tile order.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.textContent,
        '❌ Solve Failed',
        'Auto-solve button should show a failure message when solving does not complete.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.disabled,
        false,
        'Auto-solve button should be re-enabled after a failed solve attempt.'
    );

    assert.strictEqual(
        puzzleStub.ui.enableGameButtonsCalled,
        true,
        'UI controls should be re-enabled after the solver fails.'
    );

    assert.strictEqual(
        puzzleStub.game.isSolving,
        false,
        'Game state should no longer be flagged as solving after failure.'
    );

    assert.strictEqual(
        puzzleStub.game.moveCount,
        puzzleStub.originalMoveCount,
        'Move count should be restored to the original value after failure.'
    );

    assert.strictEqual(
        puzzleStub.ui.updateMoveCountCalledWith,
        puzzleStub.originalMoveCount,
        'UI should reflect the restored move count after a failed solve.'
    );

    assert.strictEqual(
        puzzleStub.ui.setDifficultyDisabledCalled,
        false,
        'Difficulty selection should remain disabled while the puzzle is still unsolved.'
    );

    assert.strictEqual(
        scheduledTimeouts.length > 0,
        true,
        'Failure handling should schedule a reset for the auto-solve button text.'
    );

    console.log('executeSolveMoves failure scenario handled correctly.');
} finally {
    globalThis.setTimeout = originalSetTimeout;
}
