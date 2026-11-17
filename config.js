// ============================================================
// 画像の差し替え設定
// 画像ファイルを assets/ フォルダに入れて、下の名前を書き換えるだけでOK。
// ファイルが無い場合は、自動で仮のシェイプ(ピンク・オレンジ等)が表示されます。
// 推奨: 背景透過PNG。サイズは画面(360×693基準)上の見た目のまま配置されます。
// ============================================================
// ------------------------------------------------------------
// 画像ごとの拡大率(中心を基準に拡大)。1 = そのまま、2.5 = 2.5倍。
// 画像に透明な余白が多くて小さく見えるときは、ここを大きくする。
// ------------------------------------------------------------
window.SCALE = {
    charBlue: 1.0,
    charGrey: 3.1,
    titleBox: 3.0
    // 例: btnFind: 1.2, sand: 1
  };
  
  window.ASSETS = {
    sand:        "sand.png",        // 下の砂地(横幅いっぱい・下部 約100px分)
    btnFind:     "btn-find.png",    // ホーム:ピンクの「Texture を探しに行く」ボタン
    btnBox:      "btn-box.png",     // ホーム:オレンジの「Texture Box」ボタン
    headerBlob:  "header-blob.png", // 撮影・切り抜き画面上部のピンク
    charBlue:    "char-blue.png",   // 青いトゲトゲのキャラ
    charGrey:    "char-grey.png",   // 灰色のキャラ(ホームのみ)
    btnFolder:   "btn-folder.png",  // 撮影画面:左下の四角ボタン(端末フォルダ)
    btnShutter:  "btn-shutter.png", // 撮影画面:丸いシャッターボタン
    btnSave:     "btn-save.png",    // 切り抜き画面:「あつめる」ボタン
    noticeFrame: "notice-frame.png",// notice/date 枠のギザギザ縁
    iconCalendar:"icon-calendar.png",// Texture Box 画面右上のカレンダー
    titleBox:    "title-box.png"    // Texture Box 画面左上のタイトル文字
  };