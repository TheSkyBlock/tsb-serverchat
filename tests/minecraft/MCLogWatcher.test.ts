import 'reflect-metadata';

import { container } from 'tsyringe';
import fs from 'fs';

import { MCLogWatcher } from '@/minecraft/MCLogWatcher';
import { Config } from '@/Config';
import { streamToString } from '@/util/streamToString';

jest.mock('@/util/streamToString');

const mockStreamToString = streamToString as jest.Mock;

Object.defineProperty(Config.prototype, 'Minecraft', {
    get: jest.fn<ConfigData['minecraft'], any[]>(() => ({
        serverPath: 'MINECRAFT_SERVER_PATH',
        teleportpointsMcfunction: 'MINECRAFT_TELEPORTPOINTS_MCFUNCTION'
    }))
});

describe('MCLogWatcher', () => {
    test('Start()', () => {
        jest.useFakeTimers();
        const mockFsStatSync = jest.spyOn(fs, 'statSync').mockReturnValue({
            size: 100,
            mtimeMs: 0
        } as fs.Stats);
        let mockPromisesStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({
            size: 10,
            mtimeMs: 0
        } as fs.Stats);

        const stream = fs.ReadStream.from(Buffer.from('HOGE')) as fs.ReadStream;
        const mockCreateReadStream = jest.spyOn(fs, 'createReadStream').mockReturnValue(stream);

        const mcLogWatcher = container.resolve(MCLogWatcher);

        expect(mcLogWatcher.Start()).toBeUndefined();

        jest.advanceTimersToNextTimer();

        mockPromisesStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({
            size: 20,
            mtimeMs: 1
        } as fs.Stats);
        mockStreamToString.mockResolvedValue([
            '',
            'INVALID LOG',
            '[00:00:00] [Server thread/INFO]: <USERNAME> MESSAGE',
            '[00:00:00] [Server thread/INFO]: USERNAME joined the game',
            '[00:00:00] [Server thread/INFO]: USERNAME left the game',
            '[00:00:00] [Server thread/INFO]: Done (0.000ms)! For help, type "help"',
            '[00:00:00] [Server thread/INFO]: Stopping the server',
            '[00:00:00] [Server thread/INFO]: OTHER LOG'
        ].join('\n'));

        jest.advanceTimersToNextTimer();

        expect(mockFsStatSync).toBeCalledTimes(1);
        expect(mockPromisesStat).toBeCalledTimes(2);

        mockFsStatSync.mockClear();
        mockPromisesStat.mockClear();
        mockCreateReadStream.mockClear();
        mockStreamToString.mockClear();
    });

    test('Stop() watchInterval is null', () => {
        const mcLogWatcher = container.resolve(MCLogWatcher);
        mcLogWatcher['watchInterval'] = null;

        expect(mcLogWatcher.Stop()).toBeUndefined();
    });

    test('Stop()', () => {
        const mcLogWatcher = container.resolve(MCLogWatcher);
        // @ts-ignore
        mcLogWatcher['watchInterval'] = jest.fn();

        expect(mcLogWatcher.Stop()).toBeUndefined();
    });

    test('on(event, listener)', () => {
        const mcLogWatcher = container.resolve(MCLogWatcher);

        expect(mcLogWatcher['on']('player-chat', jest.fn())).toEqual(mcLogWatcher);
    });
});
