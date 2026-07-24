/**
 * @name QuestAutofille
 * @author Mak0Dev
 * @description Automatically manages and completes Discord Quests
 * @version 1.0.2
 * @website https://github.com/Mak0Dev/QuestAutofille
 */

module.exports = class QuestAutofille {
    start() {
        console.log("[QuestAutofille] Starting...");

        try {
            if (window.$) delete window.$;


            let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
            webpackChunkdiscord_app.pop();


            let ApplicationStreamingStore, RunningGameStore, QuestsStore, ChannelStore, GuildChannelStore, FluxDispatcher, api;


            try {
                ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
                RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames)?.exports?.ZP;
                QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports?.Z;
                ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports?.Z;
                GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel)?.exports?.ZP;
                FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.dispatch && x?.exports?.h?.subscribe)?.exports?.h;
                api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get && x?.exports?.tn?.post)?.exports?.tn;
            } catch (e) { }


            if (!QuestsStore) {
                try {
                    ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.A;
                    RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames)?.exports?.Ay;
                    QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
                    ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports?.A;
                    GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel)?.exports?.Ay;
                    FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.dispatch && x?.exports?.h?.subscribe)?.exports?.h;
                    api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get && x?.exports?.Bo?.post)?.exports?.Bo;
                } catch (e) { }
            }


            if (!QuestsStore) {
                for (const key in wpRequire.c) {
                    const mod = wpRequire.c[key];
                    if (!mod?.exports) continue;

                    try {

                        for (const prop in mod.exports) {
                            const val = mod.exports[prop];
                            if (val?.quests && typeof val.getQuest === 'function') {
                                QuestsStore = val;
                            }
                            if (val?.getRunningGames && typeof val.getRunningGames === 'function') {
                                RunningGameStore = val;
                            }
                            if (val?.dispatch && val?.subscribe && typeof val.dispatch === 'function') {
                                FluxDispatcher = val;
                            }
                            if (val?.get && val?.post && typeof val.get === 'function') {
                                api = val;
                            }
                        }
                    } catch (e) { }
                }
            }

            console.log("[QuestAutofille] Modules found:", {
                QuestsStore: !!QuestsStore,
                RunningGameStore: !!RunningGameStore,
                FluxDispatcher: !!FluxDispatcher,
                api: !!api
            });

            if (!QuestsStore) {
                console.error("[QuestAutofille] QuestsStore not found!");
                return;
            }


            let quests = [];
            try {

                quests = [...QuestsStore.quests.values()];
            } catch (e) {
                try {

                    quests = Object.values(QuestsStore.quests);
                } catch (e2) {
                    try {

                        if (QuestsStore.quests instanceof Map) {
                            quests = Array.from(QuestsStore.quests.values());
                        } else if (Array.isArray(QuestsStore.quests)) {
                            quests = QuestsStore.quests;
                        } else {

                            for (const key in QuestsStore) {
                                const val = QuestsStore[key];
                                if (val && typeof val === 'object') {
                                    try {
                                        if (val.values && typeof val.values === 'function') {
                                            quests = Array.from(val.values());
                                            break;
                                        }
                                        if (Array.isArray(val)) {
                                            quests = val;
                                            break;
                                        }
                                    } catch (e) { }
                                }
                            }
                        }
                    } catch (e3) {
                        console.error("[QuestAutofille] Failed to get quests:", e3);
                    }
                }
            }

            const supportedTasks = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY"];


            let activeQuests = quests.filter(q => {
                try {
                    const taskConfig = q?.config?.taskConfig ?? q?.config?.taskConfigV2;
                    const hasTask = supportedTasks.some(t => taskConfig?.tasks?.[t]);

                    return q?.userStatus?.enrolledAt &&
                        !q?.userStatus?.completedAt &&
                        q?.config?.expiresAt &&
                        new Date(q.config.expiresAt).getTime() > Date.now() &&
                        hasTask;
                } catch (e) {
                    return false;
                }
            });

            console.log(`[QuestAutofille] Total quests: ${quests.length}, Active: ${activeQuests.length}`);

            if (!activeQuests.length) {
                console.log("[QuestAutofille] No active quests");
                return;
            }

            const isApp = typeof DiscordNative !== "undefined";


            const processQuest = async (quest) => {
                try {
                    const questName = quest.config?.messages?.questName || "Unknown";
                    const taskConfig = quest.config?.taskConfig ?? quest.config?.taskConfigV2;
                    const tasks = taskConfig?.tasks || {};

                    const taskName = supportedTasks.find(t => tasks[t]);
                    if (!taskName) {
                        console.log(`[QuestAutofille] No supported task for: ${questName}`);
                        return false;
                    }

                    const applicationId = tasks[taskName]?.applications?.[0]?.id;
                    const applicationName = quest.config?.messages?.gameTitle || questName;
                    const secondsNeeded = tasks[taskName]?.target || 0;
                    let secondsDone = quest.userStatus?.progress?.[taskName]?.value || 0;

                    console.log(`[QuestAutofille] Processing: ${questName} (${taskName})`);


                    if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
                        console.log(`[QuestAutofille] Starting video quest: ${questName}`);

                        let progress = secondsDone;
                        while (progress < secondsNeeded) {
                            const nextProgress = Math.min(secondsNeeded, progress + 10);

                            try {
                                if (api) {
                                    await api.post({
                                        url: `/quests/${quest.id}/video-progress`,
                                        body: { timestamp: nextProgress }
                                    });
                                }
                                progress = nextProgress;
                                console.log(`[QuestAutofille] Progress: ${progress}/${secondsNeeded}`);
                            } catch (e) {
                                console.error("[QuestAutofille] Video error:", e);
                            }

                            await new Promise(r => setTimeout(r, 2000));
                        }

                        console.log(`[QuestAutofille] Completed: ${questName}`);
                        return true;
                    }


                    if (taskName === "PLAY_ON_DESKTOP") {
                        if (!isApp) {
                            console.log("[QuestAutofille] Desktop app required");
                            return false;
                        }

                        if (!applicationId) {
                            console.log("[QuestAutofille] No application ID");
                            return false;
                        }

                        console.log(`[QuestAutofille] Starting game quest: ${applicationName}`);

                        const pid = Math.floor(Math.random() * 30000) + 1000;


                        let appData;
                        try {
                            if (api) {
                                const res = await api.get({
                                    url: `/applications/public?application_ids=${applicationId}`
                                });
                                appData = res.body?.[0];
                            }
                        } catch (e) { }

                        const exeName = appData?.executables?.find(x => x.os === "win32")?.name?.replace(">", "") || "game.exe";
                        const appName = appData?.name || applicationName;

                        const fakeGame = {
                            cmdLine: `C:\\Program Files\\${appName}\\${exeName}`,
                            exeName: exeName,
                            exePath: `c:/program files/${appName.toLowerCase()}/${exeName}`,
                            hidden: false,
                            isLauncher: false,
                            id: applicationId,
                            name: appName,
                            pid: pid,
                            pidPath: [pid],
                            processName: appName,
                            start: Date.now(),
                        };

                        const originalGetGames = RunningGameStore.getRunningGames;
                        const originalGetGameForPID = RunningGameStore.getGameForPID;

                        RunningGameStore.getRunningGames = () => [fakeGame];
                        if (originalGetGameForPID) {
                            RunningGameStore.getGameForPID = (pid) => [fakeGame].find(x => x.pid === pid);
                        }

                        if (FluxDispatcher) {
                            FluxDispatcher.dispatch({
                                type: "RUNNING_GAMES_CHANGE",
                                removed: [],
                                added: [fakeGame],
                                games: [fakeGame]
                            });
                        }


                        let progress = secondsDone;
                        let attempts = 0;
                        const maxAttempts = Math.ceil(secondsNeeded / 5) + 20;

                        while (progress < secondsNeeded && attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 5000));
                            attempts++;

                            try {

                                if (api) {
                                    const heartRes = await api.post({
                                        url: `/quests/${quest.id}/heartbeat`,
                                        body: {
                                            game_id: applicationId,
                                            pid: pid
                                        }
                                    });

                                    const newProgress = heartRes.body?.progress?.[taskName]?.value || 0;
                                    if (newProgress > progress) {
                                        progress = newProgress;
                                        console.log(`[QuestAutofille] Progress: ${progress}/${secondsNeeded}`);
                                    }
                                }
                            } catch (e) {

                                progress = Math.min(secondsNeeded, progress + 3);
                                console.log(`[QuestAutofille] Simulated: ${progress}/${secondsNeeded}`);
                            }
                        }


                        RunningGameStore.getRunningGames = originalGetGames;
                        if (originalGetGameForPID) {
                            RunningGameStore.getGameForPID = originalGetGameForPID;
                        }

                        if (FluxDispatcher) {
                            FluxDispatcher.dispatch({
                                type: "RUNNING_GAMES_CHANGE",
                                removed: [fakeGame],
                                added: [],
                                games: []
                            });
                        }

                        console.log(`[QuestAutofille] Completed: ${questName}`);
                        return true;
                    }


                    if (taskName === "STREAM_ON_DESKTOP") {
                        if (!isApp || !ApplicationStreamingStore) {
                            console.log("[QuestAutofille] Streaming not available");
                            return false;
                        }

                        console.log(`[QuestAutofille] Starting stream quest: ${applicationName}`);

                        const pid = Math.floor(Math.random() * 30000) + 1000;
                        const originalFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;

                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                            id: applicationId,
                            pid: pid,
                            sourceName: null
                        });

                        let progress = secondsDone;
                        let attempts = 0;
                        const maxAttempts = Math.ceil(secondsNeeded / 5) + 20;

                        while (progress < secondsNeeded && attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 5000));
                            attempts++;

                            try {
                                if (api) {
                                    const heartRes = await api.post({
                                        url: `/quests/${quest.id}/heartbeat`,
                                        body: {
                                            stream_key: `stream:${pid}`,
                                            terminal: false
                                        }
                                    });

                                    const newProgress = heartRes.body?.progress?.[taskName]?.value || 0;
                                    if (newProgress > progress) {
                                        progress = newProgress;
                                        console.log(`[QuestAutofille] Progress: ${progress}/${secondsNeeded}`);
                                    }
                                }
                            } catch (e) {
                                progress = Math.min(secondsNeeded, progress + 3);
                                console.log(`[QuestAutofille] Simulated: ${progress}/${secondsNeeded}`);
                            }
                        }

                        ApplicationStreamingStore.getStreamerActiveStreamMetadata = originalFunc;
                        console.log(`[QuestAutofille] Completed: ${questName}`);
                        return true;
                    }

                    console.log(`[QuestAutofille] Unsupported: ${taskName}`);
                    return false;

                } catch (e) {
                    console.error(`[QuestAutofille] Error:`, e);
                    return false;
                }
            };


            (async () => {
                for (const quest of activeQuests) {
                    try {
                        await processQuest(quest);
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (e) {
                        console.error(`[QuestAutofille] Failed:`, e);
                    }
                }
                console.log("[QuestAutofille] All quests processed!");
            })();

        } catch (e) {
            console.error("[QuestAutofille] Fatal error:", e);
        }
    }

    stop() {
        console.log("[QuestAutofille] Stopped");
    }
};
