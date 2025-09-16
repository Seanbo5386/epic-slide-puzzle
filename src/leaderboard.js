export class LeaderboardManager {
    constructor(ui) {
        this.ui = ui;
        this.leaderboard = JSON.parse(localStorage.getItem('puzzleLeaderboard') || '[]');
        this.playerName = localStorage.getItem('puzzlePlayerName') || '';
    }

    qualifiesForLeaderboard(stats) {
        if (this.leaderboard.length < 50) return true;
        const sortedBoard = this.getSortedLeaderboard();
        const worstScore = sortedBoard[sortedBoard.length - 1];
        return this.compareScores(stats, worstScore) < 0;
    }

    compareScores(a, b) {
        if (a.time !== b.time) return a.time - b.time;
        if (a.moves !== b.moves) return a.moves - b.moves;
        return b.difficulty - a.difficulty;
    }

    showPlayerNameModal(stats) {
        this.ui.recordTimeEl.textContent = this.ui.formatTime(stats.time);
        this.ui.recordMovesEl.textContent = stats.moves;
        this.ui.recordDifficultyEl.textContent = `${stats.difficulty}×${stats.difficulty}`;

        this.ui.playerNameInput.value = this.playerName;
        this.ui.playerNameModal.classList.remove('hidden');

        setTimeout(() => this.ui.playerNameInput.focus(), 300);
    }

    saveRecord() {
        const name = this.ui.playerNameInput.value.trim() || 'Anonymous';
        this.playerName = name;
        localStorage.setItem('puzzlePlayerName', name);

        this.ui.playerNameModal.classList.add('hidden');

        if (this.ui.onRecordSave) {
            this.ui.onRecordSave(name);
        }
    }

    skipRecord() {
        this.ui.playerNameModal.classList.add('hidden');
    }

    showLeaderboard(highlightId = null) {
        this.ui.leaderboardModal.classList.remove('hidden');
        this.renderLeaderboard('all', highlightId);
    }

    hideLeaderboard() {
        this.ui.leaderboardModal.classList.add('hidden');
    }

    filterLeaderboard(difficulty) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });

        this.renderLeaderboard(difficulty);
    }

    renderLeaderboard(difficulty = 'all', highlightId = null) {
        let records = this.getSortedLeaderboard();

        if (difficulty !== 'all') {
            records = records.filter(r => r.difficulty.toString() === difficulty);
        }

        if (records.length === 0) {
            this.ui.leaderboardList.innerHTML = '<div class="no-records">No records for this difficulty yet!</div>';
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
                            <span class="stat-badge time-badge">${this.ui.formatTime(record.time)}</span>
                            <span class="stat-badge moves-badge">${record.moves} moves</span>
                            <span class="stat-badge difficulty-badge">${record.difficulty}×${record.difficulty}</span>
                            <span class="stat-badge">${date}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.ui.leaderboardList.innerHTML = html;

        if (highlightId) {
            setTimeout(() => {
                const highlighted = this.ui.leaderboardList.querySelector('.highlight');
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
            this.ui.userRankEl.textContent = '#--';
            return;
        }

        const userRecords = this.leaderboard.filter(r => r.name === this.playerName);
        if (userRecords.length === 0) {
            this.ui.userRankEl.textContent = '#--';
            return;
        }

        const bestUserRecord = userRecords.sort(this.compareScores.bind(this))[0];
        const sortedBoard = this.getSortedLeaderboard();
        const rank = sortedBoard.findIndex(r => r.id === bestUserRecord.id) + 1;

        this.ui.userRankEl.textContent = rank > 0 ? `#${rank}` : '#--';
    }

    addToLeaderboard(record) {
        this.leaderboard.push(record);
        this.leaderboard = this.getSortedLeaderboard().slice(0, 50);
        localStorage.setItem('puzzleLeaderboard', JSON.stringify(this.leaderboard));
        this.updateUserRank();
        this.showLeaderboard(record.id);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
