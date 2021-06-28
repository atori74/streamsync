# streamsync

Streamsyncはブラウザ間でストリーミング動画の再生タイミングを同期するためのGoogle Chrome拡張機能です。  

Streamsync is a google chrome extension that enables to sync playback position between Host and Client (different browsers).  

## 対応サービス

- Youtube
- Amazon Prime Video
- Netflix

## How to install

Chromeウェブストアから拡張機能をインストール

もしくは、ソースをダウンロードしChromeのデベロッパーモードで拡張機能をインストールしてください。

参考手順：[https://support.google.com/chrome/a/answer/2714278?hl=ja](https://support.google.com/chrome/a/answer/2714278?hl=ja)

## How to use

### Roomの作成

1. 同期したい動画をタブで開いた状態で、ポップアップメニューから「ルームを開く」をクリックする
2. 正常にRoomが開かれるとポップアップ上にRoom IDが表示されるので、一緒に動画を見たい人にRoom IDを共有する
3. 同期を終了するときは、「ルームを終了」をクリックする

### Roomに参加

1. ポップアップメニューのフォームにHostから共有されたRoom IDを入力し、「ルームに参加」をクリック
2. Roomへの参加が完了すると、自動的に新しいタブが開かれ対象の動画ページに移動する
3. Hostの再生地点と同期されるように、再生、停止、シークなどの操作が自動で行われる
4. 同期を終了するときは、「ルームを退出」をクリックする

#### タイミングオフセットの調整

意図してホストと再生タイミングをずらしたい場合は、クライアント側のポップアップメニューでオフセット（秒）を調整することができます。  
プラスのオフセットはクライアント側のタイミングを遅らせ、マイナスのオフセットは逆に早めます。  

ex. ホストとの通話ラグが１秒ある場合、オフセットを+1に設定する。

## How streamsync works

Host(chrome) -> (data) -> Websocket Server -> (data) -> Client(chrome)

Hostのブラウザは視聴する動画ごとにRoomを作ることができ、ClientのブラウザはRoomに参加することができます。  
Hostは視聴中の動画の再生地点を定期的にRoomに配信します。Roomに参加しているClientは、配信された再生地点をもとに視聴中の動画をリアルタイムにシークします。  
これによりHostとClientの再生タイミングが同期されます。

Host-Client間はサーバーを経由してWebsocketsで通信します。

Host can open a room and Clients can join it. Host sends playback position data of video or streaming playing in browser to the room. Clients in the same room receive the data and automatically sync the playback position of video or streaming.

Host and Client have each Websocket connection with server as long as they are in the room.

### Related Repository

**[atori74/streamsync-server](https://github.com/atori74/streamsync-server)**  
Websocket server for streamsync, that communicates with Hosts and Clients
