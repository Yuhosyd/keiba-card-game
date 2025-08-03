// unbuild.js (高機能版・修正済み)
// 必要なモジュールをインポートします
const fs = require('fs');
const path = require('path');

// --- モジュール定義 ---
// 各ファイルがエクスポートする関数や変数をリスト化します。
// これを基に、削除された `ui.` や `game.` などの接頭辞を復元します。
const MODULE_EXPORTS = {
    ui: [
        'titleScreen', 'gameScreen', 'gameStartButton', 'startButton', 'playButton', 'endGameButton',
        'playerHandArea', 'playerListContainer', 'resultArea', 'corseTitle', 'selectedCardInfo',
        'turnCounter', 'finalResultScreen', 'finalScores', 'returnToTitleButton', 'scorePreview',
        'passButton', 'tacticsButton', 'tacticsChoices', 'tacticChoiceButtons', 'battleField',
        'tacticsSelectionArea', 'resetUI', 'updateStatusUI', 'updateTurnDisplay',
        'showGameEndScreen', 'displayHand', 'displayRaceDevelopmentPhase', 'displayFinalRaceResults'
    ],
    sim: [
        'generateRaceConditions', 'calculateFinalScore', 'paceAlgorithm', 'executeFinalRace', 'calculateVariance'
    ],
    game: [
        'initializeGame', 'prepareNextRound', 'handleCardSelection', 'playTurn', 'passTurn',
        'processRoundResults', 'onTacticChosen', 'concludeRace'
    ]
};

// 接頭辞を復元するヘルパー関数
function restorePrefixes(content, moduleMap) {
    let newContent = content;
    for (const prefix in moduleMap) {
        const functionsAndVars = moduleMap[prefix];
        functionsAndVars.forEach(name => {
            // 正規表現で、単語として独立している名前のみを対象に置換します
            // 例: `resetUI(...)` は `ui.resetUI(...)` になるが、`my_resetUI(...)` はそのまま
            const regex = new RegExp(`\\b${name}\\b`, 'g');
            newContent = newContent.replace(regex, `${prefix}.${name}`);
        });
    }
    return newContent;
}

// アンビルド（復元）処理を実行するメイン関数
async function unbuild() {
    try {
        console.log('高機能版アンビルドプロセスを開始します...');
        const debugHtmlPath = path.join(__dirname, 'debug.html');

        if (!fs.existsSync(debugHtmlPath)) {
            console.error('エラー: debug.html が見つかりません。');
            return;
        }

        const htmlContent = await fs.promises.readFile(debugHtmlPath, 'utf8');
        console.log('debug.htmlを読み込みました。');

        // --- CSSの復元 ---
        const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
            await fs.promises.writeFile(path.join(__dirname, 'style.css'), styleMatch[1].trim());
            console.log('style.css を復元しました。');
        }

        // --- JavaScriptの復元準備 ---
        const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
        if (!scriptMatch) {
            console.error('エラー: <script> タグが見つかりません。');
            return;
        }
        
        const combinedJs = scriptMatch[1];
        const jsFileContents = {};
        const markers = {
            'card_data.js': '// --- card-data.jsの内容 ---',
            'ui.js': '// --- ui.jsの内容 ---',
            'race-simulation.js': '// --- race-simulation.jsの内容 ---',
            'game-logic.js': '// --- game-logic.jsの内容 ---',
            'script.js': '// --- script.jsの内容（初期化処理） ---'
        };

        // マーカーを使ってJavaScriptを分割
        Object.keys(markers).forEach((key, i, arr) => {
            const startMarker = markers[key];
            const endMarker = arr[i + 1] ? markers[arr[i + 1]] : undefined;
            const startIndex = combinedJs.indexOf(startMarker) + startMarker.length;
            const endIndex = endMarker ? combinedJs.indexOf(endMarker) : combinedJs.length;
            jsFileContents[key] = combinedJs.substring(startIndex, endIndex).trim();
        });

        // --- 各JavaScriptファイルの書き出し ---

        // card_data.js
        let cardDataContent = jsFileContents['card_data.js'];
        cardDataContent = 'export ' + cardDataContent;
        await fs.promises.writeFile(path.join(__dirname, 'card_data.js'), cardDataContent);
        console.log('card_data.js を復元しました。');

        // ui.js
        // ★修正: 行頭のconst/functionのみをexportするように正規表現を修正
        let uiContent = jsFileContents['ui.js'].replace(/^function /gm, 'export function ').replace(/^const /gm, 'export const ');
        await fs.promises.writeFile(path.join(__dirname, 'ui.js'), uiContent);
        console.log('ui.js を復元しました。');
        
        // race-simulation.js
        // ★修正: 行頭のfunctionのみをexportするように正規表現を修正
        let raceSimContent = jsFileContents['race-simulation.js'].replace(/^function /gm, 'export function ');
        await fs.promises.writeFile(path.join(__dirname, 'race-simulation.js'), raceSimContent);
        console.log('race-simulation.js を復元しました。');

        // game-logic.js
        let gameLogicContent = jsFileContents['game-logic.js'];
        gameLogicContent = restorePrefixes(gameLogicContent, { ui: MODULE_EXPORTS.ui, sim: MODULE_EXPORTS.sim });
        // ★修正: 行頭のfunctionのみをexportするように正規表現を修正
        const processedGameLogic = gameLogicContent.replace(/^function /gm, 'export function ');
        const finalGameLogicContent = `import { CARD_MASTER_DATA } from './card_data.js';\nimport * as ui from './ui.js';\nimport * as sim from './race-simulation.js';\n\n` + processedGameLogic;
        await fs.promises.writeFile(path.join(__dirname, 'game-logic.js'), finalGameLogicContent);
        console.log('game-logic.js を復元しました。');

        // script.js
        let scriptContent = jsFileContents['script.js'];
        scriptContent = restorePrefixes(scriptContent, { ui: MODULE_EXPORTS.ui, game: MODULE_EXPORTS.game });
        scriptContent = `import * as ui from './ui.js';\nimport * as game from './game-logic.js';\n\n` + scriptContent;
        await fs.promises.writeFile(path.join(__dirname, 'script.js'), scriptContent);
        console.log('script.js を復元しました。');

        // --- index.htmlの復元 ---
        const bodyMatch = htmlContent.match(/<body>([\s\S]*)<\/body>/);
        if (bodyMatch) {
            const bodyContent = bodyMatch[1].replace(/<script>[\s\S]*?<\/script>/, '<script type="module" src="script.js"></script>').trim();
            const newHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>RaceHorceTactics</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="images/favicon.png" type="image/png">
</head>
<body>
${bodyContent}
</body>
</html>`;
            await fs.promises.writeFile(path.join(__dirname, 'index.html'), newHtml);
            console.log('index.html を復元しました。');
        }

        console.log('すべてのファイルの復元が完了しました！');

    } catch (error) {
        console.error('復元中にエラーが発生しました:', error);
    }
}

// アンビルド関数を実行します
unbuild();
