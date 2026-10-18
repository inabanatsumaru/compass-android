# 山陰コンパス（Android 野良アプリ版）

1. このフォルダの中身を GitHub の新規リポジトリ（main ブランチ）に push
2. Actions タブの「Build APK」が自動で走る（3〜5分）
3. 完了した実行を開き、Artifacts の `compass-apk` をダウンロード → 解凍して `app-debug.apk` を取り出す
4. スマホに APK を送ってタップ → 「提供元不明のアプリ」を許可してインストール

画面を変えたいときは `www/index.html` を編集して push し直す。
