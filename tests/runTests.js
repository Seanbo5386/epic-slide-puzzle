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

await import('./findNextBestMove.test.js');
await import('./executeSolveMovesFailure.test.js');
await import('./solverAvailability.test.js');

console.log('All tests completed.');
