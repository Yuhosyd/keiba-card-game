// --- HTML要素の取得 ---
// このファイルで使うDOM要素はここで取得し、他のファイルで使えるようにエクスポートする
export const titleScreen = document.getElementById('title-screen');
export const gameScreen = document.getElementById('game-screen');
export const gameStartButton = document.getElementById('game-start-button');
export const startButton = document.getElementById('startButton');
export const playButton = document.getElementById('play-button');
export const endGameButton = document.getElementById('end-game-button');
export const playerHandArea = document.getElementById('player-hand');
export const playerListContainer = document.getElementById('player-list-container');
export const resultArea = document.getElementById('result-area');
export const corseTitle = document.getElementById('corse-title');
export const selectedCardInfo = document.getElementById('selected-card-info');
export const turnCounter = document.getElementById('turn-counter');
export const finalResultScreen = document.getElementById('final-result-screen');
export const finalScores = document.getElementById('final-scores');
export const returnToTitleButton = document.getElementById('return-to-title-button');
export const scorePreview = document.getElementById('score-preview');
export const passButton = document.getElementById('pass-button');
export const tacticsButton = document.getElementById('tactics-button');
export const tacticsChoices = document.getElementById('tactics-choices');
export const tacticChoiceButtons = document.querySelectorAll('.tactic-choice-button');
export const battleField = document.getElementById('battle-field');
export const tacticsSelectionArea = document.getElementById('tactics-selection-area');
export const toggleRankingButton = document.getElementById('toggle-ranking-button');
export const fullRankingContainer = document.getElementById('full-ranking-container');
export const drawerToggleButtonRight = document.getElementById('drawer-toggle-button-right');
export const rightColumn = document.getElementById('right-column'); 

/**
 * UIを完全に初期状態に戻す、便利なお掃除関数
 * @param {object} states - 現在のゲーム状態
 */
export function resetUI() {
    document.body.classList.remove('turn-over');
    if (corseTitle) corseTitle.textContent = '';
    if (battleField) battleField.innerHTML = '';
    resultArea.innerHTML = '';
    playerHandArea.innerHTML = '';
    if (selectedCardInfo) selectedCardInfo.innerHTML = '';
    if (scorePreview) scorePreview.textContent = '--';
    endGameButton.style.display = 'none';
    returnToTitleButton.style.display = 'none';
    toggleRankingButton.classList.add('hidden');
    fullRankingContainer.classList.add('hidden')
    ;
    if (rightColumn) { // 既に取得済みの rightColumn を使用
        rightColumn.classList.remove('is-open-right'); // ドロワーを閉じる
    }
    if (drawerToggleButtonRight) {
        drawerToggleButtonRight.textContent = '◀'; // ボタンのテキストをリセット
    }
}

/**
 * 画面上のステータス表示を更新する専門の関数
 * @param {Array} players - 全プレイヤーのデータ配列
 */
export function updateStatusUI(players) {
    if (!playerListContainer || players.length === 0) return;
    playerListContainer.innerHTML = '';
    players.forEach(player => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'player-status-entry';
        if (player.isHuman) {
            entryDiv.classList.add('is-player');
        }
        entryDiv.textContent = `${player.name}: ${player.money.toLocaleString()} 円`;
        playerListContainer.appendChild(entryDiv);
    });
}

/**
 * 画面上のターン表示を更新する専門の関数
 * @param {number} currentTurn - 現在のターン数
 */
export function updateTurnDisplay(currentTurn) {
    if (turnCounter) {
        turnCounter.textContent = currentTurn;
    }
}


// 全着順の表示を切り替える新しい関数
export function toggleFullRanking() {
    fullRankingContainer.classList.toggle('hidden');
    if (fullRankingContainer.classList.contains('hidden')) {
        toggleRankingButton.textContent = '全着順を見る';
    } else {
        toggleRankingButton.textContent = '閉じる';
    }
}


/**
 * 8ターン終了時に、最終リザルト画面を表示する関数
 * @param {Array} players - 全プレイヤーのデータ配列
 */
export function showGameEndScreen(players) {
    // ゲーム画面を非表示にし、最終結果画面を表示
    gameScreen.classList.add('hidden');
    finalResultScreen.classList.remove('hidden');

    // 所持金順にソート
    const sortedPlayers = [...players].sort((a, b) => b.money - a.money);

    // 表示用のHTMLを生成
    let finalScoresHtml = '<h3>最終ランキング</h3><ol style="text-align: left; padding-left: 25px; margin: 0;">';
    sortedPlayers.forEach(player => {
        finalScoresHtml += `<li>${player.name}: ${player.money.toLocaleString()} 円</li>`;
    });
    finalScoresHtml += '</ol>';

    // finalScores要素にHTMLを流し込む
    finalScores.innerHTML = finalScoresHtml;

    // 「タイトルへ戻る」ボタンを表示
    returnToTitleButton.style.display = 'block'; // blockまたはflexに設定
}

/**
 * 現在の手札を画面に描画（表示）する関数
 * @param {Array} playerHand - プレイヤーの手札配列
 * @param {Function} onCardSelect - カードが選択されたときに実行されるコールバック関数
 */
export function displayHand(playerHand, onCardSelect) {
    playerHandArea.innerHTML = '';
    playerHand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        //けが
        if (card.isInjured) {
            cardDiv.classList.add('injured');
        }

        cardDiv.innerHTML = `<img src="${card.image}" alt="${card.name}">`;
        
        cardDiv.addEventListener('click', () => {
            // 他のカードの選択状態を解除
            document.querySelectorAll('#player-hand .card').forEach(c => c.classList.remove('selected'));
            // クリックしたカードを選択状態にする
            cardDiv.classList.add('selected');
            // コールバック関数を実行して、ゲームロジックに選択されたカードを伝える
            onCardSelect(card);
        });
        playerHandArea.appendChild(cardDiv);
    });
}



/**
 * レース展開フェーズ（formation順）を画面に表示する
 * @param {Array} formationRanking - formation値でソートされた馬の配列
 * @param {object} racePaceInfo - レースのペースに関する情報
 * @param {Array} players - 全プレイヤーのデータ配列
 */
export function displayRaceDevelopmentPhase(formationRanking, racePaceInfo, players) {
    battleField.innerHTML = '';
    resultArea.innerHTML = 'レース展開中...';

    const infoDiv = document.createElement('div');
    infoDiv.style.width = '100%';
    infoDiv.style.textAlign = 'center';
    infoDiv.style.marginBottom = '15px';

    // racePaceInfo が undefined または null でないかチェックし、プロパティが存在しない場合はデフォルト値を設定
    const leadHorseName = racePaceInfo?.leadHorseName || '不明';
    const paceDescription = racePaceInfo?.paceDescription || '不明なペース';
    const inVenueBias = racePaceInfo?.inVenueBias !== undefined ? racePaceInfo.inVenueBias.toFixed(2) : '--';
    const outVenueBias = racePaceInfo?.outVenueBias !== undefined ? racePaceInfo.outVenueBias.toFixed(2) : '--';

    infoDiv.innerHTML = `
        <p style="margin: 2px 0; font-size: 0.9em;">逃げ馬: <strong>${leadHorseName}</strong> | ペース: ${paceDescription}</p>
        <p style="margin: 2px 0; font-size: 0.9em;">コースバイアス: 内 ${inVenueBias} / 外 ${outVenueBias}</p>
    `;
    battleField.appendChild(infoDiv); // infoDivは常に追加する

    const cardsContainer = document.createElement('div');
    cardsContainer.style.display = 'flex';
    cardsContainer.style.flexWrap = 'wrap';
    cardsContainer.style.gap = '10px';
    cardsContainer.style.justifyContent = 'center';

    // formationRanking が空でない場合のみカードを表示
    if (formationRanking && formationRanking.length > 0) {
        formationRanking.forEach(result => {
            const player = players[result.playerIndex];
            const card = result.card;
            // パスした馬（result.card.name === '(パス)' または result.card.name === '(不参加)'）は表示しない、またはプレースホルダーにする
            // ここでは `result.score > 0` の馬のみが formationRanking に含まれる前提
            //もし含まれる可能性があれば、ここでもチェックが必要
            const cardHTML = `
                <div class="battle-card-area">
                    <p class="player-name">${player.name}</p>
                    <div class="card-image-container">
                        <img src="${card.image}" alt="${card.name}">
                    </div>
                </div>
            `;
            cardsContainer.innerHTML += cardHTML;
        });
    } else {
        // レース参加者がいない場合のプレースホルダー表示
        cardsContainer.innerHTML = '<p style="text-align: center; width: 100%;">レース参加馬がいません。</p>';
    }
    
    battleField.appendChild(cardsContainer);
}






/**
 * 最終的なレース結果を整形して表示する
 * @param {Array} finalRanking - 最終スコアでソートされた結果の配列
 * @param {object} fastestFinisher - 上がり最速馬のオブジェクト
 * @param {Array} players - 全プレイヤーのデータ配列
 */
export function displayFinalRaceResults(finalRanking, fastestFinisher, players) {
    battleField.innerHTML = '';

    if (finalRanking.length === 0) {
        resultArea.innerHTML = 'レース参加者がいませんでした。';
        return;
    }

    const podiumContainer = document.createElement('div');
    podiumContainer.style.display = 'flex';
    podiumContainer.style.gap = '20px';
    podiumContainer.style.justifyContent = 'center';
    podiumContainer.style.alignItems = 'flex-end';
    podiumContainer.style.width = '100%';
    podiumContainer.style.marginBottom = '20px';

    finalRanking.slice(0, 3).forEach((result, index) => {
        const player = players[result.playerIndex];
        const card = result.card;
        let orderStyle = 'transform: translateY(0);';
        if (index === 0) orderStyle = 'transform: translateY(-20px); order: 2;'; // 1st
        if (index === 1) orderStyle = 'order: 1;'; // 2nd
        if (index === 2) orderStyle = 'order: 3;'; // 3rd

        const podiumCardHTML = `
            <div class="battle-card-area" style="${orderStyle}">
                <p class="horse-number" style="font-size: 1.5em; color: var(--selected-color);">${index + 1}着</p>
                <p class="player-name">${player.name}</p>
                <div class="card-image-container">
                    <img src="${card.image}" alt="${card.name}">
                </div>
                <p style="font-size:0.9em; margin: 5px 0 0 0;">${card.name}</p>
            </div>
        `;
        podiumContainer.innerHTML += podiumCardHTML;
    });
    battleField.appendChild(podiumContainer);

    // 全着順リストの生成をここで行う
    const fullRankingList = document.getElementById('full-ranking-list');
    fullRankingList.innerHTML = ''; // リストをクリア
    finalRanking.forEach((result, index) => {
        const player = players[result.playerIndex];
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}着: ${result.card.name} (${player.name})`;
        fullRankingList.appendChild(listItem);
    });

    const winnerResult = finalRanking[0];
    const winnerPlayer = players[winnerResult.playerIndex];
    resultArea.innerHTML = `
        ${winnerPlayer.name} の ${winnerResult.card.name} が勝利！
        <br>
        <span style="font-size: 0.8em; color: var(--secondary-text-color);">上がり最速: ${fastestFinisher ? fastestFinisher.card.name : '該当なし'}</span>
    `;
        // ボタンを表示
    toggleRankingButton.classList.remove('hidden');

}

