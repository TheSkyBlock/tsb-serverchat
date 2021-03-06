import 'reflect-metadata';

import { container } from 'tsyringe';

import { Config } from '@/Config';
import { CmdCommand } from '@/discord/commands/CmdCommand';
import { RconClient } from '@/rcon/RconClient';

jest.mock('@/rcon/RconClient');
jest.mock('@/discord/util/requireContext', () => ({
    requireContext: jest.fn()
}));

Object.defineProperty(Config.prototype, 'Discord', {
    get: jest.fn<ConfigData['discord'], any[]>(() => ({
        token: 'DISCORD_TOKEN',
        chatChannel: 'DISCORD_CHAT_CHANNEL'
    }))
});

describe('CmdCommand', () => {
    test('command', () => {
        const command = container.resolve(CmdCommand);

        expect(command['command']).toEqual<ApplicationCommandWithoutId>({
            name: 'cmd',
            description: expect.anything(),
            options: [
                {
                    name: 'command',
                    description: expect.anything(),
                    type: 3,
                    required: true
                }
            ]
        });
    });

    test('callback(interaction) wrong chatChannel', async () => {
        const mockRconClientSend = jest.spyOn(RconClient.prototype, 'Send');

        const command = container.resolve(CmdCommand);

        const interaction: Interaction = {
            id: 'ID',
            type: 1,
            data: {
                id: 'ID',
                name: 'cmd',
                options: [
                    {
                        name: 'command',
                        value: 'VALUE'
                    }
                ]
            },
            guild_id: 'GUILD_ID',
            channel_id: 'WRONG_CHANNEL_ID',
            member: jest.fn() as any,
            token: 'TOKEN',
            version: 0
        };

        await expect(command['callback'](interaction as any)).resolves.toEqual<InteractionResponse>({
            type: 2
        });

        expect(mockRconClientSend).not.toBeCalled();
        mockRconClientSend.mockClear();
    });

    test('callback(interaction)', async () => {
        const mockRconClientSend = jest.spyOn(RconClient.prototype, 'Send');

        const command = container.resolve(CmdCommand);

        const interaction: Interaction = {
            id: 'ID',
            type: 1,
            data: {
                id: 'ID',
                name: 'cmd',
                options: [
                    {
                        name: 'command',
                        value: 'VALUE'
                    }
                ]
            },
            guild_id: 'GUILD_ID',
            channel_id: 'DISCORD_CHAT_CHANNEL',
            member: jest.fn() as any,
            token: 'TOKEN',
            version: 0
        };

        await expect(command['callback'](interaction as any)).resolves.toEqual<InteractionResponse>({
            type: 4,
            data: expect.anything()
        });

        expect(mockRconClientSend).toBeCalledTimes(1);
        expect(mockRconClientSend.mock.calls[0][0]).toBe('VALUE');
        mockRconClientSend.mockClear();
    });

    test('callback(interaction) -', async () => {
        const mockRconClientSend = jest.spyOn(RconClient.prototype, 'Send').mockResolvedValue('');

        const command = container.resolve(CmdCommand);

        const interaction: Interaction = {
            id: 'ID',
            type: 1,
            data: {
                id: 'ID',
                name: 'cmd',
                options: [
                    {
                        name: 'command',
                        value: 'VALUE'
                    }
                ]
            },
            guild_id: 'GUILD_ID',
            channel_id: 'DISCORD_CHAT_CHANNEL',
            member: jest.fn() as any,
            token: 'TOKEN',
            version: 0
        };

        await expect(command['callback'](interaction as any)).resolves.toEqual<InteractionResponse>({
            type: 4,
            data: expect.anything()
        });

        expect(mockRconClientSend).toBeCalledTimes(1);
        expect(mockRconClientSend.mock.calls[0][0]).toBe('VALUE');
        mockRconClientSend.mockClear();
    });
});
