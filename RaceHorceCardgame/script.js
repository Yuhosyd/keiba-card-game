import * as ui from './ui.js';
import * as game from './game-logic.js';

// --- 初期化処理 (イベントリスナー設定) ---
// ゲーム開始ボタン
ui.gameStartButton.addEventListener('click', () => {
    ui.titleScreen.style.display = 'none';
    ui.gameScreen.classList.remove('hidden');
    game.initializeGame();
});
// 次のレースへボタン
//ui.startButton.addEventListener('click', game.prepareNextRound);
// この馬で挑戦ボタン
ui.playButton.addEventListener('click', game.playTurn);
// 今回は見送るボタン
ui.passButton.addEventListener('click', game.passTurn);
// タイトルへ戻るボタン（ゲーム終了後）
ui.endGameButton.addEventListener('click', () => {
    ui.gameScreen.classList.add('hidden');
    ui.titleScreen.style.display = 'flex';
    // initializeGame() は呼ばず、UIをリセットするだけ
    ui.resetUI();
});
// タイトルへ戻るボタン（最終リザルト画面）
ui.returnToTitleButton.addEventListener('click', () => {
    ui.finalResultScreen.classList.add('hidden');
    ui.titleScreen.style.display = 'flex';
});
// 「戦術を指示」ボタン
ui.tacticsButton.addEventListener('click', () => {
    ui.tacticsButton.classList.add('hidden');
    ui.tacticsChoices.classList.remove('hidden');
});
// 5つの戦術選択肢ボタン
ui.tacticChoiceButtons.forEach(button => {
    button.addEventListener('click', () => {
        const selectedTactic = button.dataset.tactic;
        game.onTacticChosen(selectedTactic);
    });
});

// 全着順
ui.toggleRankingButton.addEventListener('click', () => {
    ui.toggleFullRanking();
});

const drawerToggleButton = document.getElementById('drawer-toggle-button');
const leftColumn = document.getElementById('left-column');

// ドロワー開閉ボタンがクリックされたときの処理(左)
drawerToggleButton.addEventListener('click', () => {
    // is-openクラスを付けたり外したりして、表示を切り替える
    leftColumn.classList.toggle('is-open');

    // ボタンの矢印の向きを変えて、状態を分かりやすくする
    if (leftColumn.classList.contains('is-open')) {
        drawerToggleButton.textContent = '◀';
    } else {
        drawerToggleButton.textContent = '▶';
    }
});

// ドロワー開閉ボタンがクリックされたときの処理 (右)
ui.drawerToggleButtonRight.addEventListener('click', () => {
    // ui.rightColumn を直接使用
    ui.rightColumn.classList.toggle('is-open-right');

    if (ui.rightColumn.classList.contains('is-open-right')) {
        ui.drawerToggleButtonRight.textContent = '▶';
    } else {
        ui.drawerToggleButtonRight.textContent = '◀';
    }
});

