# tsb-serverchat

[![License_Badge][]][License]
[![CI_Badge][]][CI]
![Version_Badge][]

TSB開発サーバーとTSB Discordのチャットを連携するプログラム

## 開発環境

- [Visual Studio Code][]
- [Node.js][]
- [Yarn][]

## 機能

- Discordチャンネル <-> TSB開発サーバーのチャット連携
- TSB開発サーバーの起動、停止をDiscordに通知
- TSB開発サーバーへのログイン、ログアウトをDiscordに通知
- Discord Botのステータスにサーバーの状態、ログイン人数をリアルタイム表示
- Discordチャンネルの説明欄にTSB開発サーバーのログイン中プレイヤーを表示
- Discordチャンネルに貼り付けられたSchematicファイルをTSB開発サーバーにアップロードする機能

## Discordコマンド

### `/help`

Botのヘルプを出力します

### `/cmd <command>`

- `command` **string** Minecraftコマンド

TSB開発サーバーにコマンドを送信します

### `/schematic <list|delete>`

Schematicファイルを管理します

#### `list`

アップロードしたSchematicファイルの一覧を表示します

#### `delete <file_name>`

- `file_name` **string** 削除するSchematicファイルの名前

Schematicファイルを削除します

### `/teleportpoint <list|add|remove>`

テレポートポイントを設定します

#### `list`

テレポートポイントの一覧を表示します

#### `add <dimension> <name> <x> <y> <z>`

- `dimension` **string** ディメンション名
- `name` **string** テレポートポイント名
- `x` **int** テレポートポイントのX座標
- `y` **int** テレポートポイントのY座標
- `z` **int** テレポートポイントのZ座標

テレポートポイントを追加します

#### `remove <dimension> <name>`

- `dimension` **string** ディメンション名
- `name` **string** テレポートポイント名

テレポートポイントを削除します

## ライセンス

[MIT][License]

<!-- リンク -->

[License_Badge]: https://img.shields.io/github/license/TheSkyBlock/tsb-serverchat
[CI_Badge]: https://img.shields.io/github/workflow/status/TheSkyBlock/tsb-serverchat/CI?logo=github&label=CI
[Version_Badge]: https://img.shields.io/github/package-json/v/TheSkyBlock/tsb-serverchat

[License]:./LICENSE
[CI]: https://github.com/TheSkyBlock/tsb-serverchat/actions/workflows/ci.yml

[Visual Studio Code]:https://code.visualstudio.com/
[Node.js]:https://nodejs.org/ja/
[Yarn]:https://classic.yarnpkg.com/ja/
