import { TextChannel, Message } from 'discord.js';
import { singleton, inject } from 'tsyringe';

import { Config } from '@/Config';
import { DiscordBotClient } from '@/discord/DiscordBotClient';
import { RconClient } from '@/rcon/RconClient';
import { MCLogWatcher, PlayerActionType, ServerLogType } from '@/minecraft/MCLogWatcher';

type LoginUsers = {
    count: string;
    max: string;
    users: string[];
};

/**
 * listコマンドの戻り値の正規表現
 */
const REGEX_LIST_COMMAND = /^There are ([^ ]*) of a max of ([^ ]*) players online: ?(.*)$/;

/**
 * チャンネルトピック更新間隔(ms)\
 * API制限の事情で5分毎
 */
const TOPIC_UPDATE_MS = (1000 * 60) * 5;

@singleton<TSBDevServerBot>()
export class TSBDevServerBot {
    private textChannel: TextChannel | null = null;

    private topicUpdateInterval: NodeJS.Timeout | null = null;

    public constructor(
        @inject(Config) private config: Config,
        @inject(DiscordBotClient) private discordBotClient: DiscordBotClient,
        @inject(RconClient) private rconClient: RconClient,
        @inject(MCLogWatcher) private mcLogWatcher: MCLogWatcher
    ) {}

    /**
     * Botを起動する
     */
    public async Launch(): Promise<void> {
        this.discordBotClient.on('ready', this.discordBotClient_onReady.bind(this));
        this.discordBotClient.on('chat', this.discordBotClient_onChat.bind(this));

        await this.discordBotClient.Launch();

        this.topicUpdateInterval = setInterval(
            this.topicUpdate.bind(this),
            TOPIC_UPDATE_MS
        );
    }

    /**
     * Botを終了する\
     * ついでにログ監視、Rconも終了
     */
    public async Destroy(): Promise<void> {
        this.mcLogWatcher.Stop();
        await this.rconClient.Stop();
        await this.discordBotClient.Destroy();

        if (this.topicUpdateInterval) {
            clearInterval(this.topicUpdateInterval);
        }
    }

    /**
     * ログイン中のユーザーのリストを返す
     */
    private async getLoginUsers(): Promise<LoginUsers | null> {
        try {
            const listCommandResponce = await this.rconClient.Send('list');
            const regexListCommand = REGEX_LIST_COMMAND.exec(listCommandResponce);
            if (!regexListCommand) return null;

            const [, count, max, users] = regexListCommand;

            return {
                count,
                max,
                users: users.split(', ').filter(x => x !== '')
            };
        }
        catch {
            return null;
        }
    }

    /**
     * Botのステータスを変更する\
     * 開発サーバー起動時はログイン中の人数を表示します
     */
    private async setBotStatus() {
        const loginUsers = await this.getLoginUsers();

        if (loginUsers) {
            const { count, max } = loginUsers;

            this.discordBotClient.SetBotStatus('online', `[${count}/${max}] TSB Dev`);
        }
        else {
            this.discordBotClient.SetBotStatus('dnd', '[サーバー停止] TSB Dev');
        }
    }

    /**
     * チャンネルトピック更新
     */
    private async topicUpdate() {
        if (!this.textChannel) return;

        const loginUsers = await this.getLoginUsers();

        if (loginUsers) {
            const { users } = loginUsers;

            await this.textChannel.setTopic(`[5分毎更新] ログイン中: ${users.join(', ') || '-'}`);
        }
        else {
            await this.textChannel.setTopic('[5分毎更新] サーバー停止中');
        }
    }

    /**
     * Bot準備完了時
     */
    private async discordBotClient_onReady() {
        this.textChannel = await this.discordBotClient.GetTextChannel(this.config.Discord.chatChannel);

        await this.rconClient.Launch();

        await this.setBotStatus();

        // 開発サーバーのログ監視を開始
        this.mcLogWatcher.on('player-chat', this.mcLogWatcher_onPlayerChat.bind(this));
        this.mcLogWatcher.on('player-action', this.mcLogWatcher_onPlayerAction.bind(this));
        this.mcLogWatcher.on('server-log', this.mcLogWatcher_onServerLog.bind(this));
        this.mcLogWatcher.Start();
    }

    /**
     * チャット送信時
     * @param channelId チャンネルID
     * @param username ユーザー名
     * @param message メッセージ
     */
    private async discordBotClient_onChat(message: Message) {
        const username = message.author.username;
        const text = message.content.replace(/\n/g, '\\n');

        try {
            console.log(`<${username}> ${text}`);
            await this.rconClient.Send(`tellraw @a {"text": "<${username}> ${text}"}`);
        }
        catch {
            // \u26A0 = ⚠
            message.react('\u26A0');
        }
    }

    /**
     * プレイヤーチャットログ検出時
     * @param name プレイヤー名
     * @param message チャットメッセージ
     */
    private async mcLogWatcher_onPlayerChat(name: string, message: string) {
        if (!this.textChannel) return;

        await this.textChannel.send(`<${name}> ${message}`);
    }

    /**
     * プレイヤーアクションログ検出時
     * @param name プレイヤー名
     * @param type アクションタイプ
     */
    private async mcLogWatcher_onPlayerAction(name: string, type: PlayerActionType) {
        if (!this.textChannel) return;

        let title: string | undefined;
        let color: string | undefined;

        if (type === 'login') {
            title = `\`${name}\` がログインしました`;
            color = '#79b59a';
        }
        else {
            title = `\`${name}\` がログアウトしました`;
            color = '#f09090';
        }

        await this.setBotStatus();

        const loginUsers = await this.getLoginUsers();
        if (!loginUsers) return;

        const { count, max, users } = loginUsers;

        await this.textChannel.send({
            embed: {
                title,
                color,
                fields: [
                    {
                        name: 'ログイン中',
                        value: users.map(x => `\`${x}\``).join(', ') || '-',
                        inline: true
                    },
                    {
                        name: '人数',
                        value: `${count}/${max}`,
                        inline: true
                    }
                ]
            }
        });
    }

    /**
     * サーバーログ検出時
     * @param type サーバーログタイプ
     */
    private async mcLogWatcher_onServerLog(type: ServerLogType) {
        if (!this.textChannel) return;

        let title: string | undefined;
        let color: string | undefined;

        if (type === 'start') {
            title = 'サーバーが起動しました';
            color = '#43b581';

            await this.rconClient.Launch();
        }
        else {
            title = 'サーバーが停止しました';
            color = '#f04747';

            await this.rconClient.Stop();
        }

        await this.setBotStatus();

        await this.textChannel.send({
            embed: {
                title,
                color
            }
        });
    }
}
