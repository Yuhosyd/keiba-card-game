// build.js
// 必要なモジュールをインポートします
const fs = require('fs');
const path = require('path');

// ビルド処理を実行するメイン関数
async function build() {
    try {
        console.log('ビルドプロセスを開始します...');

        // 各ファイルのパスを定義します
        const htmlFilePath = path.join(__dirname, 'index.html');
        const cssFilePath = path.join(__dirname, 'style.css');
        const jsFilePaths = [
            path.join(__dirname, 'card_data.js'),
            path.join(__dirname, 'ui.js'),
            path.join(__dirname, 'race-simulation.js'),
            path.join(__dirname, 'game-logic.js'),
            path.join(__dirname, 'script.js')
        ];
        const outputFilePath = path.join(__dirname, 'debug.html');

        // ベースとなるHTMLファイルを読み込みます
        let htmlContent = await fs.promises.readFile(htmlFilePath, 'utf8');
        console.log('index.htmlを読み込みました。');

        // CSSファイルを読み込み、<style>タグに埋め込みます
        const cssContent = await fs.promises.readFile(cssFilePath, 'utf8');
        htmlContent = htmlContent.replace('<link rel="stylesheet" href="style.css">', `<style>\n${cssContent}\n</style>`);
        console.log('style.cssを埋め込みました。');

        // JavaScriptファイルを順番に読み込み、結合します
        let combinedJsContent = '';
        const fileMarkers = {
            'card_data.js': '// --- card-data.jsの内容 ---',
            'ui.js': '// --- ui.jsの内容 ---',
            'race-simulation.js': '// --- race-simulation.jsの内容 ---',
            'game-logic.js': '// --- game-logic.jsの内容 ---',
            'script.js': '// --- script.jsの内容（初期化処理） ---'
        };

        // モジュール呼び出しの接頭辞（ui. や sim. など）を削除するための設定
        const prefixReplacements = {
            'game-logic.js': [/sim\./g, /ui\./g],
            'script.js': [/ui\./g, /game\./g]
        };

        for (const filePath of jsFilePaths) {
            const fileName = path.basename(filePath);
            let jsContent = await fs.promises.readFile(filePath, 'utf8');
            
            // ESモジュールのimport/export文を削除します
            jsContent = jsContent.replace(/^import .* from '.*';/gm, '');
            jsContent = jsContent.replace(/export { .* };/g, '');
            jsContent = jsContent.replace(/export /g, '');

            // 該当するファイルからモジュール呼び出しの接頭辞を削除します
            if (prefixReplacements[fileName]) {
                prefixReplacements[fileName].forEach(prefixRegex => {
                    jsContent = jsContent.replace(prefixRegex, '');
                });
                console.log(`${fileName} のモジュール接頭辞を削除しました。`);
            }

            combinedJsContent += `\n\n${fileMarkers[fileName]}\n${jsContent}`;
            console.log(`${fileName}を結合しました。`);
        }

        // 結合したJavaScriptを<script>タグに埋め込みます
        htmlContent = htmlContent.replace('<script type="module" src="script.js"></script>', `<script>\n${combinedJsContent}\n</script>`);
        console.log('すべてのJavaScriptを埋め込みました。');

        // 最終的なHTMLファイルを出力します
        await fs.promises.writeFile(outputFilePath, htmlContent);
        console.log(`ビルドが完了しました！ debug.html が生成されました。`);
        console.log("注意: CSS内の画像パス（例: 'images/dark-grass.png'）が正しく解決されるように、'images'フォルダをdebug.htmlと同じ階層に配置してください。");

    } catch (error) {
        console.error('ビルド中にエラーが発生しました:', error);
    }
}

// ビルド関数を実行します
build();
