# Epic Slide Puzzle

A modular slide puzzle game with image upload, animations, and leaderboards.

## Running the Game

Since this project uses ES6 modules, you need to serve it over HTTP (not file://). Here are several ways to run it:

### Option 1: Using Python (Recommended)

#### If you have Python 3:
```bash
python3 -m http.server 8000
```

#### If you have Python 2 or just "python":
```bash
python -m http.server 8000
```

Then open: http://localhost:8000

### Option 2: Using npm
If you have Node.js installed:
```bash
npm run dev
```

### Option 3: Using any other HTTP server
- Use Live Server extension in VS Code
- Use any other local development server

### Option 4: Alternative Solution (No Server Required)

If you can't run a local server, I can provide a bundled version that works with file:// protocol.

## Project Structure

```
src/
├── game.js    # Core game logic and state management
├── ui.js      # UI management and DOM interactions  
├── main.js    # Main entry point that orchestrates everything
```

## Features

- Upload and crop any image to create puzzles
- Multiple difficulty levels (2x2 to 6x6)
- Smooth tile animations and particle effects
- Auto-solve functionality
- Hint system
- Leaderboard with persistent storage
- Best time tracking
- Celebration effects when puzzle is solved

## Development

The original monolithic `script.js` has been refactored into three modules:

- **GameState**: Handles puzzle logic, moves, timing, and game rules
- **UIManager**: Manages DOM elements, canvas drawing, and user interactions
- **SlidePuzzle**: Orchestrates the game flow and connects the other modules

All functionality from the original version is preserved while providing better code organization and maintainability.