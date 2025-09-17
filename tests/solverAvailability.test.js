import assert from 'node:assert/strict';

const { SlidePuzzle } = await import('../src/main.js');

function createPuzzleStub({ gridSize, isGameActive = true, isSolving = false }) {
    const puzzleStub = {
        game: {
            gridSize,
            isGameActive,
            isSolving,
            tiles: [],
            emptyIndex: gridSize * gridSize - 1,
            moveCount: 0,
            isSolved() {
                return false;
            },
            findSolution() {
                return [];
            }
        },
        ui: {
            autoSolveBtn: {
                textContent: SlidePuzzle.AUTO_SOLVE_LABEL,
                disabled: false
            },
            nextMoveBtn: {
                textContent: SlidePuzzle.NEXT_MOVE_LABEL,
                disabled: false
            },
            drawPuzzle() {},
            highlightTile() {},
            updateMoveCount() {},
            enableGameButtons() {},
            setDifficultyDisabled() {}
        }
    };

    Object.setPrototypeOf(puzzleStub, SlidePuzzle.prototype);
    return puzzleStub;
}

{
    const unsupportedGridSize = SlidePuzzle.SOLVER_MAX_GRID_SIZE + 1;
    const puzzleStub = createPuzzleStub({ gridSize: unsupportedGridSize });
    let findSolutionCalled = false;
    puzzleStub.game.findSolution = () => {
        findSolutionCalled = true;
        return [];
    };

    SlidePuzzle.prototype.autoSolve.call(puzzleStub);

    assert.strictEqual(
        findSolutionCalled,
        false,
        'Auto-solve should bail out before invoking findSolution for unsupported grid sizes.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.textContent,
        SlidePuzzle.AUTO_SOLVE_UNSUPPORTED_LABEL,
        'Unsupported auto-solve attempts should explain the solver limit to the player.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.disabled,
        true,
        'Auto-solve button should remain disabled after refusing an unsupported request.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.textContent,
        SlidePuzzle.NEXT_MOVE_UNSUPPORTED_LABEL,
        'Next move helper should mirror the unsupported notice.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.disabled,
        true,
        'Next move button should be disabled when the solver cannot operate on the current grid size.'
    );

    assert.strictEqual(
        puzzleStub.game.isSolving,
        false,
        'Game state should not enter solving mode for unsupported puzzles.'
    );
}

{
    const unsupportedGridSize = SlidePuzzle.SOLVER_MAX_GRID_SIZE + 1;
    const puzzleStub = createPuzzleStub({ gridSize: unsupportedGridSize });
    let findSolutionCalled = false;
    puzzleStub.game.findSolution = () => {
        findSolutionCalled = true;
        return [0];
    };

    SlidePuzzle.prototype.showNextMove.call(puzzleStub);

    assert.strictEqual(
        findSolutionCalled,
        false,
        'Next-move hinting should not invoke the solver for unsupported grid sizes.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.textContent,
        SlidePuzzle.AUTO_SOLVE_UNSUPPORTED_LABEL,
        'Auto-solve messaging should align when the next-move helper declines unsupported requests.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.disabled,
        true,
        'Auto-solve should stay disabled after next-move detects an unsupported configuration.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.textContent,
        SlidePuzzle.NEXT_MOVE_UNSUPPORTED_LABEL,
        'Next-move helper should clarify that the solver is unavailable for large boards.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.disabled,
        true,
        'Next move should be disabled when the solver declines to generate hints.'
    );
}

{
    const unsupportedGridSize = SlidePuzzle.SOLVER_MAX_GRID_SIZE + 1;
    const puzzleStub = createPuzzleStub({ gridSize: unsupportedGridSize, isGameActive: true });

    SlidePuzzle.prototype.applySolverAvailability.call(puzzleStub);

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.textContent,
        SlidePuzzle.AUTO_SOLVE_UNSUPPORTED_LABEL,
        'applySolverAvailability should surface the unsupported message for large puzzles.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.disabled,
        true,
        'applySolverAvailability should disable auto-solve for unsupported sizes.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.disabled,
        true,
        'applySolverAvailability should also disable next-move for unsupported sizes.'
    );

    puzzleStub.game.gridSize = SlidePuzzle.SOLVER_MAX_GRID_SIZE;
    puzzleStub.game.isGameActive = true;
    puzzleStub.game.isSolving = false;

    SlidePuzzle.prototype.applySolverAvailability.call(puzzleStub);

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.textContent,
        SlidePuzzle.AUTO_SOLVE_LABEL,
        'Supported puzzles should restore the default auto-solve label.'
    );

    assert.strictEqual(
        puzzleStub.ui.autoSolveBtn.disabled,
        false,
        'Supported puzzles should re-enable auto-solve when the game is active.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.textContent,
        SlidePuzzle.NEXT_MOVE_LABEL,
        'Supported puzzles should restore the default next-move label.'
    );

    assert.strictEqual(
        puzzleStub.ui.nextMoveBtn.disabled,
        false,
        'Supported puzzles should re-enable the next-move helper when the game is active.'
    );
}

console.log('Solver availability safeguards verified successfully.');
