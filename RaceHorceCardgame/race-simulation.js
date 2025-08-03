/**
 * レース条件をランダムに生成する関数
 */
export function generateRaceConditions() {
    let grade;
    const random = Math.random();
    if (random < 0.2) {         // 20%の確率
        grade = 'G1';
    } else if (random < 0.5) {  // 30%の確率 (0.2 + 0.3)
        grade = 'G2';
    } else {                    // 50%の確率
        grade = 'G3';
    }

    const venues = ['tokyo', 'nakayama', 'hanshin', 'kyoto', 'chukyo', 'sapporo', 'hakodate', 'kokura', 'niigata', 'fukushima'];
    const venue = venues[Math.floor(Math.random() * venues.length)];
    const track = Math.random() < 0.9 ? 'turf' : 'dirt';
    const distanceCategories = [1200, 1400, 1600, 1800, 2000, 2200, 2400, 3000];
    const distance = distanceCategories[Math.floor(Math.random() * distanceCategories.length)];
    const weather = Math.random() < 0.7 ? 'sunny' : 'rainy';
    const isFilliesOnly = Math.random() < 0.13; // 13%の確率でtrueになる
    return { grade , venue, track, distance, weather, isFilliesOnly };
}

/**
 * カード1枚とレース条件から素のスコアを計算する関数
 */
export function calculateFinalScore(card, conditions) {
    let finalScore = 1;
    let abilityScore = 0;
    if (conditions.track === 'turf') {
        if (conditions.weather === 'sunny') {
            abilityScore = card.baseStats.power + (card.baseStats.speed * 1.2) + card.baseStats.stamina;
        } else {
            abilityScore = (card.baseStats.power * 1.1) + card.baseStats.speed + (card.baseStats.stamina * 1.1);
        }
    } else {
        if (conditions.weather === 'sunny') {
            abilityScore = (card.baseStats.power * 1.6) + (card.baseStats.speed * 0.7) + card.baseStats.stamina;
        } else {
            abilityScore = (card.baseStats.power * 1.5) + (card.baseStats.speed * 0.9) + card.baseStats.stamina;
        }
    }
    finalScore *= abilityScore;

    //コース補正
    if (card.aptitude.venue[conditions.venue]) {
        finalScore *= (0.5 + 0.5 * card.aptitude.venue[conditions.venue]);
    }

    //芝ダート補正
    if (conditions.track === 'turf') {
        finalScore *= card.aptitude.track.turf;
    } else {
        finalScore *= card.aptitude.track.dirt;
    }

    //距離適性補正
    const distanceKey = 'd' + conditions.distance;
    if (card.aptitude.distance[distanceKey]) {
        finalScore *= (card.aptitude.distance[distanceKey] - 0.15);
    }

    //天候補正
    if (conditions.weather === 'rainy') {
        finalScore *= card.aptitude.weather;
    }

    const conditionBonus = 1 + card.baseStats.condition * 0.03;
    finalScore *= conditionBonus;
    const absoluteBonus = 1 + card.baseStats.absolute * 0.025;
    finalScore *= absoluteBonus;
    finalScore += 0;//絶対最低保証
    return finalScore;
}





/**
 * ペース，隊列、内外の有利不利を決定する関数
 * @param {Array} rankedHorses - formation値で順位付けされた馬の配列
 * @param {object} currentRaceConditions - 現在のレース条件
 * @param {number} currentTurn - 現在のターン
 */
export function paceAlgorithm(rankedHorses, currentRaceConditions, currentTurn) {
    console.log("--- ペースアルゴリズム開始 ---");

    // --- 隊列タイプの決定 ---
    const formationScores = rankedHorses.map(h => h.formation);
    const leaderFormation = formationScores[0];
    const secondFormation = formationScores[1] || 0;
    const variance = calculateVariance(formationScores);
    console.log(`Formationの分散値: ${variance.toFixed(2)}`);

    let packType = '';
    const RABIT_THRESHOLD = 3;
    const VERTICAL_THRESHOLD = 640;

    if (leaderFormation > secondFormation * RABIT_THRESHOLD) {
        packType = 'rabit';
    } else if (variance > VERTICAL_THRESHOLD) {
        packType = 'vertical';
    } else {
        packType = 'lump';
    }
    console.log(`隊列タイプ: ${packType}`);

    // --- 1. PaceTimeの計算 ---
    const speedyHorseCount = rankedHorses.filter(h => h.formation >= 60).length;
    const NoSH = speedyHorseCount / rankedHorses.length;
    const leader = rankedHorses[0];
    const leaderCard = leader.card;
    const PaceTime = leader.formation * (1 + leaderCard.brainStats.spirits * 0.03) * (1 + (11 - leaderCard.brainStats.intelligence) * 0.03) * (1 + (NoSH + 1 / 18));
    console.log("--- ペースタイム計算結果 ---");
    console.log(`NoSH (先行意識の高い馬の割合): ${NoSH.toFixed(2)}`);
    console.log(`PaceTime: ${PaceTime.toFixed(2)}`);
    console.log("--------------------------");


    //ペース表示
    let paceDescription = '';
    if (packType === 'rabit') {
        if (PaceTime >= 150) { // rabitのハイペース
            paceDescription = 'ハイペースで飛ばしている！';
        }else{ //rabitのスロー
            paceDescription = '大逃げだ！';
        }
    } else if (packType === 'vertical') { // verticalの場合を追加
        if (PaceTime >= 140) { // verticalのハイペース
            paceDescription = '前はかなり飛ばしている！';
        } else { // verticalのスローペース
            paceDescription = '縦長の隊列だ！';
        }
    } else { // lump の場合
        if (PaceTime >= 140) { // lumpのハイペース：ハイペース適性が高い馬が有利
            paceDescription = 'ハイペースな展開になった！';
        } else { // lumpのスローペース：スローペース適性が高い馬が有利
            paceDescription = '隊列一段となって進んでいる！';
        }
    }


    // --- 各馬のPaceCorrectを計算 ---
    rankedHorses.forEach((horse, index) => {
    let PaceCorrect = 1; // 補正値の初期値は1
    const card = horse.card;
    const rank = index + 1;
    // 常に適用される「前有利」の基本補正
    PaceCorrect *=(1 + (19 - rank) * 0.015);
if (packType === 'rabit') {
            if (PaceTime >= 150) { // rabitのハイペース
                console.log("ペース判定: 大逃げハイ");
                if (rank > 1) PaceCorrect *= (1 - 0.02 * (19 - rank)) * (1 - (11 - card.baseStats.stamina) * 0.015) * (1 + card.brainStats.following * 0.025);
                else PaceCorrect *= 0.9 * (1 + card.brainStats.forming * 0.03); // 逃げ馬は不利
                if (horse.tacticName === '捲り') { // ハイなのに大逃げを捕まえに捲っちゃう
                    PaceCorrect *= (1.10 - (11 - card.baseStats.stamina) * 0.05);
                    console.log(`失敗捲り補正適用: ${horse.card.name}`);
                }
            } else { // rabitのスローペース
                console.log("ペース判定: ちんたら");
                PaceCorrect *= (1 + card.baseStats.speed * 0.01) * (1 -  (11 - card.brainStats.intelligence) * 0.04) * (1 + card.brainStats.following * 0.02);
                if (horse.tacticName === '捲り') { // 大逃げを捕まえに捲る
                    PaceCorrect *= (1.17 - (11 - card.baseStats.stamina) * 0.05);
                    console.log(`焦燥捲り補正適用: ${horse.card.name}`);
                }
            }
        } else if (packType === 'vertical') { // verticalの場合を追加
            if (PaceTime >= 140) { // verticalのハイペース
                console.log("ペース判定: verticalハイペース");
                PaceCorrect *= (1 - 0.03 * (19 - rank)) * (1 - (11 - card.baseStats.stamina) * 0.02) * (1 + card.baseStats.speed * 0.01);
                 // ↓縦長ハイは後方捲り馬が意外と疲れていなく、しかも最後みんな疲れるので根性勝負に↓
                if (horse.tacticName === '捲り') { 
                    PaceCorrect *= (1.2 - (11 - card.baseStats.stamina) * 0.06) * (1.17 - (11 - card.brainStats.spirits) * 0.04);
                    console.log(`根性捲り補正適用: ${horse.card.name}`);
                }
            } else { // verticalのスローペース
                console.log("ペース判定: verticalスローペース");
                PaceCorrect *= (1 + card.baseStats.speed * 0.03) * (1 + card.brainStats.forming * 0.05) * (1 - (11 - card.brainStats.intelligence) * 0.02);
                if (horse.tacticName === '捲り') { // 縦長なので馬を信じた勝負の大捲り
                    PaceCorrect *= (1.2 - (11 - card.baseStats.stamina) * 0.05);
                    console.log(`大捲り補正適用: ${horse.card.name}`);
                }
            }
        } else { // lump の場合
            if (PaceTime >= 140) { // lumpのハイペース：ハイペース適性が高い馬が有利
                console.log("ペース判定: lumpハイペース");
                PaceCorrect *= (1 - 0.02 * (19 - rank)) * (1 - (11 - card.baseStats.stamina) * 0.025) * (1 + card.brainStats.following * 0.02);
                if (horse.tacticName === '捲り') { // 一団速すぎて捲れない。
                    PaceCorrect *= (1 - (11 - card.baseStats.stamina) * 0.02);
                    console.log(`無駄捲り補正適用: ${horse.card.name}`);
                }
            } else { // lumpのスローペース：スローペース適性が高い馬が有利
                console.log("ペース判定: lumpスローペース");
                PaceCorrect *= (1 + card.baseStats.speed * 0.02) * (1 + card.brainStats.forming * 0.04) * (1 - (11 - card.brainStats.intelligence) * 0.04);
                if (horse.tacticName === '捲り') { // 隊列一段のため捲りやすい、いい早仕掛け
                    PaceCorrect *= (1.3 - (11 - card.baseStats.stamina) * 0.06);
                    console.log(`ハマり捲り補正適用: ${horse.card.name}`);
                }
            }
        }
    horse.PaceCorrect = PaceCorrect;
});

    // --- 内外（InorOut）の決定 ---
    rankedHorses[0].InorOut = 3;
    if (packType === 'rabit' || packType === 'vertical') {
        for (let i = 1; i < rankedHorses.length; i += 2) {
            const horse1 = rankedHorses[i];
            const horse2 = rankedHorses[i + 1];
            if (!horse2) { horse1.InorOut = 3; break; }
            if (Math.abs(horse1.gateNumber - horse2.gateNumber) === 1) {
                if (horse1.gateNumber > horse2.gateNumber) { horse1.InorOut = 3; horse2.InorOut = 2; } else { horse2.InorOut = 3; horse1.InorOut = 2; }
            } else {
                if (horse1.gateNumber < horse2.gateNumber) { horse1.InorOut = 3; horse2.InorOut = 2; } else { horse2.InorOut = 3; horse1.InorOut = 2; }
            }
        }
    } else { // lumpの場合
        for (let i = 1; i < rankedHorses.length; i += 3) {
            const group = rankedHorses.slice(i, i + 3);
            if (group.length === 1) {
                group[0].InorOut = 3;
            } else if (group.length === 2) {
                const [horse1, horse2] = group;
                if (Math.abs(horse1.gateNumber - horse2.gateNumber) === 1) {
                    if (horse1.gateNumber > horse2.gateNumber) { horse1.InorOut = 3; horse2.InorOut = 2; } else { horse2.InorOut = 3; horse1.InorOut = 2; }
                } else {
                    if (horse1.gateNumber < horse2.gateNumber) { horse1.InorOut = 3; horse2.InorOut = 2; } else { horse2.InorOut = 3; horse1.InorOut = 2; }
                }
            } else {
                group.sort((a, b) => a.gateNumber - b.gateNumber);
                const [innerHorse, middleHorse, outerHorse] = group;
                const isInnerMiddleAdjacent = (middleHorse.gateNumber - innerHorse.gateNumber === 1);
                const isMiddleOuterAdjacent = (outerHorse.gateNumber - middleHorse.gateNumber === 1);
                if (!isInnerMiddleAdjacent && !isMiddleOuterAdjacent) {
                    innerHorse.InorOut = 3; middleHorse.InorOut = 2; outerHorse.InorOut = 1;
                } else if (!isInnerMiddleAdjacent && isMiddleOuterAdjacent) {
                    innerHorse.InorOut = 3; middleHorse.InorOut = 2; outerHorse.InorOut = 1;
                } else if (isInnerMiddleAdjacent && !isMiddleOuterAdjacent) {
                    outerHorse.InorOut = 3; innerHorse.InorOut = 2; middleHorse.InorOut = 1;
                } else {
                    innerHorse.InorOut = 3; middleHorse.InorOut = 2; outerHorse.InorOut = 1;
                }
            }
        }
    }

    // --- 開催地補正計算 ---
    console.log("--- 開催地補正計算開始 ---");
    let InVenue = 1.0, OutVenue = 1.0;
    const venue = currentRaceConditions.venue;
    const smallCourses = ['kokura', 'hanshin', 'fukushima', 'nakayama', 'chukyo'];
    if (smallCourses.includes(venue)) { InVenue = 1.05; OutVenue = 0.95; }
    else if (venue === 'hakodate') { InVenue = 1.1; OutVenue = 0.9; }
    if (currentRaceConditions.weather === 'rainy') { InVenue *= 0.95; OutVenue *= 1.05; }
    InVenue *= (1 + (9 - currentTurn) * 0.02);
    console.log(`コースバイアス -> In: ${InVenue.toFixed(2)}, Out: ${OutVenue.toFixed(2)} (Turn: ${currentTurn}, Weather: ${currentRaceConditions.weather})`);
    
    rankedHorses.forEach(horse => {
        let HorseRoute = 1.0;
        let inOutBonus = 1.0;
        if (horse.InorOut === 3) { inOutBonus = 1.025; } else if (horse.InorOut === 1) { inOutBonus = 0.975; }
        HorseRoute *= inOutBonus;

        //追い込み捲りの馬は最終直線で外に出すはず
        if (horse.InorOut === 3 && (horse.tacticName === '捲り' || horse.tacticName === '追込')) { HorseRoute *= OutVenue; }
        else if (horse.InorOut === 3) { HorseRoute *= InVenue; }
        else if (horse.InorOut === 1) { HorseRoute *= OutVenue; }
        else if (horse.InorOut === 2) { HorseRoute *= (InVenue + OutVenue) / 2; }

        horse.VenueCorrect = HorseRoute;
    });

// --- アクシデント判定 ---
console.log("--- アクシデント判定開始 ---");
rankedHorses.forEach(horse => {
    // アクシデントが発生しなかった馬の補正値は1.0
    horse.AccidentCorrect = 1.0; 

    // 新しい故障率を計算
    // card.accidentRate に (11 - card.baseStats.condition) を掛ける
    // conditionが10なら1、conditionが1なら10が乗算される
    const modifiedAccidentRate = horse.card.accidentRate * (11 - horse.card.baseStats.condition);
    console.log(`${horse.card.name} (Condition: ${horse.card.baseStats.condition}): 元の故障率 ${horse.card.accidentRate}, 修正後故障率 ${modifiedAccidentRate.toFixed(4)}`); // デバッグ用ログ

    if (Math.random() < modifiedAccidentRate) {
        console.error(`！！！ 大アクシデント発生： ${horse.card.name} ！！！`);
        horse.AccidentCorrect *= 0.03; // スコアに致命的なペナルティ
        
        // 下記Step2のための「怪我フラグ」を立てる
        horse.card.isInjured = true;
    }
});

    // --- 最終スコア計算 ---
    console.log("--- 最終スコア計算開始 ---");
    rankedHorses.forEach(horse => {
        const venueCorrection = horse.VenueCorrect || 1.0;
        const finalScore = horse.score * horse.PaceCorrect * venueCorrection * horse.AccidentCorrect;
        horse.finalScore = finalScore;
        console.log(`${horse.card.name}: finalScore = ${horse.score.toFixed(2)}(素点) * ${horse.PaceCorrect.toFixed(2)}(ペース) * ${venueCorrection.toFixed(2)}(開催地) = ${finalScore.toFixed(2)}`);
    });
    console.log("--------------------------");

    // --- 最終確認ログ ---
    console.log("--- 隊列・内外・補正値 最終結果 ---");
    rankedHorses.forEach((horse, index) => {
        console.log(`${index + 1}番手: ${horse.card.name} (馬番: ${horse.gateNumber}) -> InOut: ${horse.InorOut || '未'}, Pace: ${horse.PaceCorrect.toFixed(2)}, Venue: ${(horse.VenueCorrect || 0).toFixed(2)}`);
    });
    console.log("--------------------------");
    
    return {
    paceTime: PaceTime,
    packType: packType,
    inVenueBias: InVenue,
    outVenueBias: OutVenue,
    leadHorseName: rankedHorses[0].card.name,
    paceDescription: paceDescription
};
}



/**
 * 最終的なレースのシミュレーションを実行する
 * @param {string} chosenTactic - プレイヤーが選択した戦術
 * @param {Array} frameOrder - 枠順が確定した参加者の配列
 * @param {object} currentRaceConditions - 現在のレース条件
 * @param {number} currentTurn - 現在のターン
 * @returns {object} - レースの途中経過と最終結果を含むオブジェクト
 */
export function executeFinalRace(chosenTactic, frameOrder, currentRaceConditions, currentTurn) {
    // --- Step 1: strategyの数値を決定 ---
    const strategyMap = { nige: 5, senkou: 4, sashi: 3, makuri: 2, oikomi: 1 };
    const reverseStrategyMap = { 5: '逃げ', 4: '先行', 3: '差し', 2: '捲り', 1: '追込', 0: '(観戦)' };

    if (!frameOrder || frameOrder.length === 0) {
        return { formationRanking: [], finalRanking: [], racePaceInfo: {} }; // 参加者がいない場合は空のデータを返す
    }

    const playerTacticValue = (chosenTactic === '(観戦)') ? 0 : strategyMap[chosenTactic];
    if (chosenTactic !== '(観戦)') {
        console.log(`選択された戦術: ${chosenTactic} (戦略値: ${playerTacticValue})`);
    } else {
        console.log("観戦モードです。");
    }

    // --- skillform と formation 値を計算 ---
    // frameOrder は元の枠順のまま、各馬に計算結果を追記していく
    // 各馬に元の馬番を記録する
    frameOrder.forEach((horse, index) => {
        horse.gateNumber = index + 1;
    });

    //cpuの戦術決定
    frameOrder.forEach(result => {
        const card = result.card;
        let cpuTacticValue; // CPUの戦術値を格納する変数

        if (result.playerIndex === 0) {
            // プレイヤーの場合は選択された戦術をそのまま使う
            cpuTacticValue = playerTacticValue;
        } else {
            // CPUの場合の戦術選択ロジック
            const forming = card.brainStats.forming;
            const intelligence = card.brainStats.intelligence;
            const following = card.brainStats.following;
            const stamina = card.baseStats.stamina;
            const speed = card.baseStats.speed;

            // 0. forming=5の場合60%で逃げ
            if (forming == 5 ) {
                if (Math.random() < 0.6) {
                    cpuTacticValue = 5; // 逃げ (nige)
                } else {
                    // 60%に外れた場合、次の分岐へ進むので、ここでは値を設定しない
                }
            }

            // 1. forming > 3.9 かつ (intelligence < 5 または following < 3) の場合、80%で逃げ
            if (forming > 3.9 && (intelligence < 5 || following < 3)) {
                if (Math.random() < 0.8) {
                    cpuTacticValue = 5; // 逃げ (nige)
                } else {
                    // 80%に外れた場合、次の分岐へ進むので、ここでは値を設定しない
                }
            }

            // 上の条件で戦術が設定されなかった場合、または意図的に次の分岐へ流す場合
            if (typeof cpuTacticValue === 'undefined') { // まだ戦術が決定していない場合
                // 2. それ以外で forming > 3 かつ intelligence > 6 の場合、60%で先行
                if (forming > 3 && intelligence > 6) {
                    if (Math.random() < 0.6) {
                        cpuTacticValue = 4; // 先行 (senkou)
                    } else {
                        // 60%に外れた場合、次の分岐へ
                    }
                }
            }

            if (typeof cpuTacticValue === 'undefined') { // まだ戦術が決定していない場合
                // 3. それ以外で following > 2.9 かつ intelligence > 5 の場合、60%で差し
                if (following > 2.9 && intelligence > 5) {
                    if (Math.random() < 0.6) {
                        cpuTacticValue = 3; // 差し (sashi)
                    } else {
                        // 60%に外れた場合、次の分岐へ
                    }
                }
            }

            if (typeof cpuTacticValue === 'undefined') { // まだ戦術が決定していない場合
                // 4. それ以外で forming < 2 かつ stamina > 7 の場合、60%で捲り
                if (forming < 2 && stamina > 7) {
                    if (Math.random() < 0.6) {
                        cpuTacticValue = 2; // 捲り (makuri)
                    } else {
                        // 60%に外れた場合、次の分岐へ
                    }
                }
            }

            if (typeof cpuTacticValue === 'undefined') { // まだ戦術が決定していない場合
                // 5. それ以外で following > 4 または (intelligence < 6 かつ speed > 6) の場合、追い込みを選択
                if (following > 4 || (intelligence < 6 && speed > 6)) {
                    cpuTacticValue = 1; // 追込 (oikomi)
                } else {
                    // どの条件にも合致しない場合、ランダムに選択
                    cpuTacticValue = Math.floor(Math.random() * 5) + 1;
                }
            }
        }

        const tacticValue = cpuTacticValue; // CPUとプレイヤーの戦術値を統合
        result.tacticValue = tacticValue;
        result.tacticName = reverseStrategyMap[tacticValue];

        // 観戦モードの馬（tacticValue === 0）の場合、skillform と formation を 0 に設定
        if (tacticValue === 0) {
            result.skillform = 0;
        } else {
            // それ以外の場合、既存の計算ロジック
            result.skillform = Math.pow(tacticValue, 2) * (1 + card.brainStats.forming * 0.1) * (1 + card.brainStats.spirits * 0.03) * (1 + card.baseStats.speed * 0.03) * (1 + card.baseStats.condition * 0.05) * (1 + card.baseStats.absolute * 0.03);
        }
    });

    // 位置関係による補正を加える
    // provisionalLeader を決定する際に、formation が 0 (観戦馬) の場合はリーダー選定から除外する
    const provisionalLeader = frameOrder.reduce((max, current) => {
        // max の初期値がない場合（最初の要素）を考慮
        if (!max && current.skillform !== 0) return current;
        // current が観戦馬の場合はスキップ
        if (current.skillform === 0) return max;
        // 通常の比較
        return current.skillform > max.skillform ? current : max;
    }, null); // reduceの初期値を null に設定


    // provisionalLeader が有効な場合のみ leaderHorseNumber を取得
    const leaderHorseNumber = provisionalLeader ? frameOrder.indexOf(provisionalLeader) : -1;

    frameOrder.forEach((result, index) => {
        let finalFormation = result.skillform; // まず skillform を使用

        // 観戦馬でなければ補正を適用
        if (result.tacticValue !== 0) {
            if (index < frameOrder.length - 1) {
                const outerHorse = frameOrder[index + 1];
                // outerHorse が存在し、かつそれが観戦馬でなければ比較する
                if (outerHorse && outerHorse.tacticValue !== 0 && outerHorse.skillform > result.skillform) {
                    finalFormation *= 0.9;
                }
            }
            // leaderHorseNumber が有効な場合のみ補正を適用
            if (leaderHorseNumber !== -1 && index < leaderHorseNumber && (leaderHorseNumber - index) < 4) {
                finalFormation *= 0.9;
            }
        }
        result.formation = finalFormation;
    });


    // --- formation値でソートした新しい配列「formationRanking」を作成 ---
    // 元のframeOrderは変更しないように、スプレッド構文(...)でコピーしてからソートする
    const formationRanking = [...frameOrder].sort((a, b) => {
        const diff = b.formation - a.formation;
        if (diff !== 0) return diff;
        return Math.random() - 0.5;
    });

    // --- ログでランキングを確認 ---
    console.log("--- 追走アルゴリズムによるformation順位 ---");
    formationRanking.forEach((result, index) => {
        const horseName = result.card.name;
        // skillformValueとformationValueが0の場合でもtoFixedが適用できるようになっています
        const skillformValue = result.skillform.toFixed(2);
        const formationValue = result.formation.toFixed(2);
        const tacticInfo = `戦術: ${result.tacticName}[${result.tacticValue}]`;
        console.log(`${index + 1}位: ${horseName} (skillform: ${skillformValue}) (${tacticInfo})(formation: ${formationValue}) (${tacticInfo})`);
    });
    const nigeUma = formationRanking[0];
    console.log(`★逃げ馬は ${nigeUma.card.name} に確定！`);
    console.log("---------------------------------------");

    // --- ペースアルゴリズムを実行して最終スコアを計算 ---
    // paceAlgorithmには、formation順にソートした配列を渡す
    const racePaceInfo = paceAlgorithm(formationRanking, currentRaceConditions, currentTurn);

    // --- 最終スコアでソートした新しい配列「finalRanking」を作成 ---
    // formationRankingを元にソートする
    const finalRanking = [...formationRanking].sort((a, b) => b.finalScore - a.finalScore);

    // --- 最終結果をオブジェクトで返す ---
    return {
        formationRanking: formationRanking, // レース展開フェーズで使う
        finalRanking: finalRanking,         // 最終結果表示で使う
        racePaceInfo: racePaceInfo          // レース展開フェーズで使う
    };
}


/**
 * 分散を計算するためのヘルパー関数
 */
export function calculateVariance(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    const squareDiffs = arr.map(val => Math.pow(val - mean, 2));
    return squareDiffs.reduce((acc, val) => acc + val, 0) / arr.length;
}