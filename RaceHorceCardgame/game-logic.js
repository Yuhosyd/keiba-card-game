import { CARD_MASTER_DATA } from './card_data.js';
import * as ui from './ui.js';
import * as sim from './race-simulation.js';

// ▼ グレード別の賞金体系を定義 ▼
const PRIZE_MONEY_BY_GRADE = {
    'G1': [200000000, 100000000, 50000000, 25000000, 12500000],
    'G2': [50000000, 25000000, 12000000, 6000000, 3000000, 1500000],
    'G3': [30000000, 15000000, 7500000, 3500000, 2000000, 1000000]
};

// --- グローバル変数定義 ---
let liveCards = [];
let selectedCard = null;
let isFirstGame = true;
let currentRaceConditions = null;
let currentTurn = 1;
const MAX_TURNS = 8;
let players = [];
const MAX_PLAYERS = 18; // 参加人数を定義(人間1 + CPU)
let frameOrder = []; // 枠順をここに保持
let lastFormationRanking = []; // 上がり最速馬



/**
 * ゲームセッション全体を初期化する関数
 */
export function initializeGame() {
    liveCards = JSON.parse(JSON.stringify(CARD_MASTER_DATA));
    isFirstGame = true;
    currentTurn = 1;

    ui.resetUI();

    ui.playButton.classList.remove('hidden');
    ui.passButton.classList.remove('hidden');
    ui.startButton.classList.add('hidden');

    players = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
        players.push({
            id: i,
            name: (i === 0) ? 'あなた' : `CPU ${i}`,
            isHuman: (i === 0),
            money: 15000000,
            hand: []
        });
    }

    ui.updateStatusUI(players);
    ui.updateTurnDisplay(currentTurn);   
    currentRaceConditions = sim.generateRaceConditions();
    console.log(`今回のレースグレード: ${currentRaceConditions.grade}`);
    ui.corseTitle.textContent = `Corse: [${currentRaceConditions.grade}] ${currentRaceConditions.venue.toUpperCase()} ${currentRaceConditions.distance}m ${currentRaceConditions.track.charAt(0).toUpperCase() + currentRaceConditions.track.slice(1)} / Weather: ${currentRaceConditions.weather}`;    
    if (currentRaceConditions.isFilliesOnly) {
    ui.corseTitle.textContent += ' (牝馬限定)';
}
    const shuffledDeck = [...liveCards].sort(() => Math.random() - 0.5);
    for (let i = 0; i < MAX_PLAYERS; i++) {
        players[i].hand = shuffledDeck.slice(i * 10, (i + 1) * 10);
    }
    
    ui.displayHand(players[0].hand, handleCardSelection);
}




/**
 * 2回目以降のラウンドを開始する準備をする関数
 */
export function prepareNextRound() {
    currentTurn++;

    ui.updateTurnDisplay(currentTurn);
    if (isFirstGame === false) {
        liveCards.forEach(card => {
            card.baseStats.condition += card.recovery;
            if (card.baseStats.condition > 10) { 
                card.baseStats.condition = 10; 
            }
        });
    }

    ui.resetUI();
    selectedCard = null;
    ui.updateStatusUI(players);
    currentRaceConditions = sim.generateRaceConditions();
    console.log(`今回のレースグレード: ${currentRaceConditions.grade}`);
    ui.corseTitle.textContent = `Corse: [${currentRaceConditions.grade}] ${currentRaceConditions.venue.toUpperCase()} ${currentRaceConditions.distance}m ${currentRaceConditions.track.charAt(0).toUpperCase() + currentRaceConditions.track.slice(1)} / Weather: ${currentRaceConditions.weather}`;
    if (currentRaceConditions.isFilliesOnly) {
    ui.corseTitle.textContent += ' (牝馬限定)';
}
    ui.displayHand(players[0].hand, handleCardSelection);
    ui.playButton.classList.remove('hidden');
    ui.passButton.classList.remove('hidden');
    ui.startButton.classList.add('hidden');
    ui.tacticsSelectionArea.classList.add('hidden');
    ui.toggleRankingButton.textContent = '全着順を見る';

}




/**
 * 手札のカードがクリックされたときの処理
 * @param {object} card - 選択されたカードオブジェクト
 */
export function handleCardSelection(card) {
    selectedCard = card;
    if (ui.selectedCardInfo) {
        ui.selectedCardInfo.innerHTML = `<strong>${selectedCard.name}</strong> / Condition: ${selectedCard.baseStats.condition}`;
        
    }
    if (ui.scorePreview) {
        const previewScore = sim.calculateFinalScore(selectedCard, currentRaceConditions);
        ui.scorePreview.textContent = previewScore.toFixed(2);
    }
}

/**
 * プレイヤーがカードを選択し、「この馬で挑戦」を押した時に実行される関数
 */
export function playTurn() {
    if (!selectedCard) {
        alert('あなたのカードを1枚選んでください！');
        return;
    }

    // 牝馬限定戦なのに、牡馬・セン馬を選んでいたらエラー
    if (currentRaceConditions.isFilliesOnly && selectedCard.gender !== 'filly') {
        alert('このレースは牝馬限定戦です！');
        return;
    }

    // ★★★ けがif ★★★
    if (selectedCard.isInjured) {
        alert('この馬は怪我のため、出走できません！');
        return;
    }


    const entryFee = 1000000;
    if (players[0].money < entryFee) {
        alert('所持金が足りず、出走できません！');
        return;
    }
    players[0].money -= entryFee;
    const playerPlayedCard = selectedCard;
    const playerScore = sim.calculateFinalScore(playerPlayedCard, currentRaceConditions);
    const playerResult = { playerIndex: 0, card: playerPlayedCard, score: playerScore };
    //selectedCard.baseStats.condition = 0;
    processRoundResults(playerResult, entryFee);
}

/**
 * プレイヤーが「今回は見送る」を押した時に実行される関数
 */
export function passTurn() {
    const entryFee = 1000000;
    const playerResult = { playerIndex: 0, card: { name: '(パス)' }, score: 0 };
    processRoundResults(playerResult, entryFee);
}

/**
 * レースの実行、結果表示、ターン終了処理を行う共通関数
 * @param {object} playerResult - プレイヤーのレース結果オブジェクト
 * @param {number} entryFee - レース参加費
 */
export function processRoundResults(playerResult, entryFee) {
    const roundResults = [playerResult];

    // --- CPUたちの処理 ---
for (let i = 1; i < MAX_PLAYERS; i++) {
    const cpu = players[i];
    // プレイヤーと同様に、CPUも出走費用の確認を前に行う
    // ただし、今回は「素点が30以上なら出す」ロジックなので、先にカードを選んでスコアを計算する必要がある
    // そのため、ここではお金があることと手札があることだけを確認する
    if (cpu.hand.length > 0) {
        let handToConsider = cpu.hand;

        // もし牝馬限定戦なら、手札を牝馬だけに絞る
        if (currentRaceConditions.isFilliesOnly) {
            handToConsider = cpu.hand.filter(card => card.gender === 'filly');
        }

        let cpuPlayedCard = null;
        let cpuScore = 0;
        let willParticipate = false; // CPUがレースに参加するかどうかを示すフラグ

        if (handToConsider.length > 0) {
            const scoredHand = handToConsider.map(card => {
                return {
                    card: card,
                    predictedScore: sim.calculateFinalScore(card, currentRaceConditions)
                };
            });
            // 素点が高い順にソート（最も高い素点のカードを選ぶため）
            scoredHand.sort((a, b) => b.predictedScore - a.predictedScore);

            // 最も素点が高いカードを取得
            const bestCardCandidate = scoredHand[0];

            // 素点が30以上で、かつ所持金が足りる場合のみ出走
            if (bestCardCandidate.predictedScore >= 10 && cpu.money >= entryFee) {
                cpuPlayedCard = bestCardCandidate.card;
                cpuScore = bestCardCandidate.predictedScore;
                cpu.money -= entryFee; // 出走費用を徴収
                willParticipate = true;
            }
        }

        if (willParticipate) {
            roundResults.push({ playerIndex: i, card: cpuPlayedCard, score: cpuScore });
        } else {
            // 素点が30未満、または所持金が足りない場合は不参加（パス扱い）
            roundResults.push({ playerIndex: i, card: { name: '(不参加)' }, score: 0 });
        }
    } else {
        // 手札がない場合は不参加
        roundResults.push({ playerIndex: i, card: { name: '(不参加)' }, score: 0 });
    }
}

    ui.updateStatusUI(players);

    // --- 枠順決定ロジック ---
    const participants = roundResults.filter(result => result.score > 0);
    for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
    }
    frameOrder = participants;
    console.log("--- 枠順確定 ---");
    frameOrder.forEach((entry, index) => {
        const playerName = players[entry.playerIndex].name;
        console.log(`${index + 1}番: ${playerName} - ${entry.card.name}`);
    });
    console.log("-------------------");

    //出走馬いない
    if (participants.length === 0) {
        ui.battleField.innerHTML = ''; // バトルフィールドをクリア
        ui.resultArea.innerHTML = 'レース参加馬がいなかったため、レースは中止されました。';
        ui.updateStatusUI(players); // お金が減っていないことを反映
        console.log("レース参加馬がいなかったため、レースは中止されました。");
        // 次のターンへ直接移行する
        document.body.classList.add('turn-over');
        ui.startButton.textContent = '次のレースへ';
        ui.startButton.classList.remove('hidden');
        return; // ここで関数を終了
    }

    // --- バトルフィールドの描画 ---
    ui.battleField.innerHTML = '';
    frameOrder.forEach((result, index) => {
        const player = players[result.playerIndex];
        const card = result.card;
        const cardImageHTML = `<img src="${card.image}" alt="${card.name}">`;
        const fieldCardHTML = `
            <div class="battle-card-area">
                <p class="horse-number">${index + 1}番</p>
                <p class="player-name">${player.name}</p>
                <div class="card-image-container">
                    ${cardImageHTML}
                </div>
            </div>
        `;
        ui.battleField.innerHTML += fieldCardHTML;
    });

    // --- プレイヤーがパスしたかどうかで処理を分岐する ---
    if (playerResult.score === 0) {
        ui.playButton.classList.add('hidden');
        ui.passButton.classList.add('hidden');
        ui.tacticsSelectionArea.classList.add('hidden');
        ui.resultArea.innerHTML = "レース観戦中...";
        document.body.classList.add('turn-over'); 
        setTimeout(() => {
             const raceResults = sim.executeFinalRace('(観戦)', frameOrder, currentRaceConditions, currentTurn);
            lastFormationRanking = raceResults.formationRanking;
            ui.displayRaceDevelopmentPhase(raceResults.formationRanking, raceResults.racePaceInfo, players);
            setTimeout(() => {
                concludeRace(raceResults.finalRanking);
            }, 4000);
        }, 1000);
    } else {
        ui.playButton.classList.add('hidden');
        ui.passButton.classList.add('hidden');
        ui.tacticsSelectionArea.classList.remove('hidden');
        ui.tacticsButton.classList.remove('hidden');
        ui.startButton.classList.add('hidden');
        document.body.classList.add('turn-over'); 
    }
}

/**
 * プレイヤーが戦術を選択した後の処理
 * @param {string} selectedTactic - 選択された戦術
 */
export function onTacticChosen(selectedTactic) {
    ui.tacticsChoices.classList.add('hidden');

    // 1. シミュレーションを実行して、全結果データを受け取る
    const raceResults = sim.executeFinalRace(selectedTactic, frameOrder, currentRaceConditions, currentTurn);

    // 2. 上がり最速馬の計算用に、formationランキングを保存
    lastFormationRanking = raceResults.formationRanking;

    // 3. UIにレース展開フェーズの表示を指示（playersを渡す）
    ui.displayRaceDevelopmentPhase(raceResults.formationRanking, raceResults.racePaceInfo, players);

    // 4. 4秒後に最終結果表示へ移行
    setTimeout(() => {
        concludeRace(raceResults.finalRanking);
    }, 4000);
}



/**
 * レース結果を処理し、UIを更新し、次のターンへ進める
 * @param {Array} finalRanking - 最終スコアでソートされた結果の配列
 */
export function concludeRace(finalRanking) {
    let fastestFinisher = null;
    if (finalRanking.length === 0) {
        ui.resultArea.innerHTML = 'レース参加者がいませんでした。';
        return;
    } else {

        // --- 上がり最速馬の計算 ---
        let maxRankGain = -99;
        finalRanking.forEach((finalHorse, finalRankIndex) => {
            const formationRankIndex = lastFormationRanking.findIndex(
                formationHorse => formationHorse.card.id === finalHorse.card.id
            );

            if (formationRankIndex !== -1) {
                const rankGain = formationRankIndex - finalRankIndex;
                if (rankGain > maxRankGain) {
                    maxRankGain = rankGain;
                    fastestFinisher = finalHorse;
                }
            }
        });

        // 現在のレースグレードに応じた賞金表を取得
        const raceGrade = currentRaceConditions.grade;
        const prizeDistribution = PRIZE_MONEY_BY_GRADE[raceGrade];

        // 1着の情報を取得して結果メッセージを作成
        const winnerResult = finalRanking[0];
        const winnerPlayer = players[winnerResult.playerIndex];
        const firstPrize = prizeDistribution[0];

        // 掲示板（賞金対象）に入った馬に賞金を分配
        for (let i = 0; i < finalRanking.length; i++) {
            // 賞金表の範囲内でのみ処理
            if (i < prizeDistribution.length) {
                const rankerResult = finalRanking[i];
                const prize = prizeDistribution[i];
                players[rankerResult.playerIndex].money += prize;
            } else {
                // 賞金圏外になったらループを抜ける
                break;
            }
        }

    }
        // ★★★ ここに、出走した全ての馬のコンディションを0にリセットする処理を追加 ★★★
        finalRanking.forEach(result => {
            if (result.card && typeof result.card.baseStats !== 'undefined') {
                result.card.baseStats.condition = 0;
            }
        });

    // 新しい結果表示関数を呼び出す（playersを渡す）
    ui.displayFinalRaceResults(finalRanking, fastestFinisher, players);
    
    // ステータスとコンソールログを更新 (この部分は変更なし)
    ui.updateStatusUI(players);
    console.log(`\n--- Turn ${currentTurn} Result ---`);
    if (isFirstGame === true) { isFirstGame = false; }

    console.log("--- 最終着順 ---");
    finalRanking.forEach((result, index) => {
        const rank = index + 1;
        const horseName = result.card.name;
        const finalScore = result.finalScore.toFixed(2);
        const baseScore = result.score.toFixed(2);
        const paceCorr = result.PaceCorrect.toFixed(2);
        const venueCorr = result.VenueCorrect.toFixed(2);
        
        console.log(`${rank}着: ${horseName} (最終スコア: ${finalScore}) [素点:${baseScore}, ペース:${paceCorr}, 開催地:${venueCorr}]`);
    });
    console.log("----------------");

    if (currentTurn >= MAX_TURNS) {
        // 最終ターンは、修正したshowGameEndScreen関数を呼び出す
        ui.showGameEndScreen(players); 

        // 最終結果画面が表示されるため、ゲーム画面のボタンは非表示にする
        ui.startButton.classList.add('hidden');
        ui.endGameButton.classList.add('hidden');

    } else {
        // --- 従来通り：最終ターン以外はこちら ---
        document.body.classList.add('turn-over');
        ui.startButton.textContent = '次のレースへ';
        ui.startButton.onclick = prepareNextRound; // クリックで次のラウンドへ進むように設定
        ui.startButton.classList.remove('hidden');
    }
}