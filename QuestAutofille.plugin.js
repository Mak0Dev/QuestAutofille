/**
 * @name QuestAutofille
 * @author Mak0Dev
 * @description Automatically manages and logs tasks for uncompleted Discord Quests.
 * @version 1.0.0
 * @website https://github.com/Mak0Dev/QuestAutofille
 */

module.exports = class QuestAutofille {
    start() {
        console.log("[QuestAutofille] Starting script execution...");
        
        try {
            // Your original setup code and environment modifications
            if (window.$) {
                delete window.$;
            }

            let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
            webpackChunkdiscord_app.pop();

            let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
            let RunningGameStore, QuestsStore, ChannelStore, GuildChannelStore, FluxDispatcher, api;
            
            if (!ApplicationStreamingStore) {
                ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata).exports.A;
                RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames).exports.Ay;
                QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest).exports.A;
                ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent).exports.A;
                GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel).exports.Ay;
                FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue).exports.h;
                api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get).exports.Bo;
            } else {
                RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
                QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
                ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
                GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
                FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
                api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn; 
            }

            const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
            let quests = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now() && supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y)));
            let isApp = typeof DiscordNative !== "undefined";

            if (quests.length === 0) {
                console.log("[QuestAutofille] You don't have any uncompleted quests!");
            } else {
                let doJob = function() {
                    const quest = quests.pop();
                    if (!quest) return;

                    const pid = Math.floor(Math.random() * 30000) + 1000;
                    
                    const applicationId = quest.config.application.id;
                    const applicationName = quest.config.application.name;
                    const questName = quest.config.messages.questName;
                    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
                    const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
                    const secondsNeeded = taskConfig.tasks[taskName].target;
                    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

                    if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
                        const maxFuture = 10, speed = 7, interval = 1;
                        const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
                        let completed = false;
                        let fn = async () => {          
                            while (true) {
                                const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture;
                                const diff = maxAllowed - secondsDone;
                                const timestamp = secondsDone + speed;
                                if (diff >= speed) {
                                    const res = await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}});
                                    completed = res.body.completed_at != null;
                                    secondsDone = Math.min(secondsNeeded, timestamp);
                                }
                                
                                if (timestamp >= secondsNeeded) {
                                    break;
                                }
                                await new Promise(resolve => setTimeout(resolve, interval * 1000));
                            }
                            if (!completed) {
                                await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: secondsNeeded}});
                            }
                            console.log(`[QuestAutofille] Quest "${questName}" completed!`);
                            doJob();
                        };
                        fn();
                        console.log(`[QuestAutofille] Spoofing video for ${questName}.`);
                    } else if (taskName === "PLAY_ON_DESKTOP") {
                        if (!isApp) {
                            console.log("[QuestAutofille] This no longer works in browser for non-video quests. Use the desktop app!");
                        } else {
                            api.get({url: `/applications/public?application_ids=${applicationId}`}).then(res => {
                                const appData = res.body[0];
                                const exeName = appData.executables.find(x => x.os === "win32").name.replace(">", "");
                                
                                const fakeGame = {
                                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                                    exeName,
                                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                                    hidden: false,
                                    isLauncher: false,
                                    id: applicationId,
                                    name: appData.name,
                                    pid: pid,
                                    pidPath: [pid],
                                    processName: appData.name,
                                    start: Date.now(),
                                };
                                const realGames = RunningGameStore.getRunningGames();
                                const fakeGames = [fakeGame];
                                const realGetRunningGames = RunningGameStore.getRunningGames;
                                const realGetGameForPID = RunningGameStore.getGameForPID;
                                RunningGameStore.getRunningGames = () => fakeGames;
                                RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
                                FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames});
                                
                                let fn = data => {
                                    let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
                                    console.log(`[QuestAutofille] Quest progress: ${progress}/${secondsNeeded}`);
                                    
                                    if (progress >= secondsNeeded) {
                                        console.log(`[QuestAutofille] Quest "${questName}" completed!`);
                                        
                                        RunningGameStore.getRunningGames = realGetRunningGames;
                                        RunningGameStore.getGameForPID = realGetGameForPID;
                                        FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []});
                                        FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                        
                                        doJob();
                                    }
                                };
                                FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                console.log(`[QuestAutofille] Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                            });
                        }
                    } else if (taskName === "STREAM_ON_DESKTOP") {
                        if (!isApp) {
                            console.log("[QuestAutofille] This no longer works in browser. Use the desktop app!");
                        } else {
                            let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
                            ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
                                id: applicationId,
                                pid,
                                sourceName: null
                            });
                            
                            let fn = data => {
                                let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
                                console.log(`[QuestAutofille] Quest progress: ${progress}/${secondsNeeded}`);
                                
                                if (progress >= secondsNeeded) {
                                    console.log(`[QuestAutofille] Quest "${questName}" completed!`);
                                    
                                    ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
                                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                                    
                                    doJob();
                                }
                              };
                            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                            
                            console.log(`[QuestAutofille] Spoofed your stream to ${applicationName}. Stream any window in VC for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`);
                            console.log("[QuestAutofille] Remember that you need at least 1 other person to be in the VC!");
                        }
                    } else if (taskName === "PLAY_ACTIVITY") {
                        const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
                        const streamKey = `call:${channelId}:1`;
                        
                        let fn = async () => {
                            console.log(`[QuestAutofille] Completing quest: ${questName}`);
                            
                            while (true) {
                                const res = await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: false}});
                                const progress = res.body.progress.PLAY_ACTIVITY.value;
                                console.log(`[QuestAutofille] Quest progress: ${progress}/${secondsNeeded}`);
                                
                                await new Promise(resolve => setTimeout(resolve, 20 * 1000));
                                
                                if (progress >= secondsNeeded) {
                                    await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}});
                                    break;
                                }
                            }
                            
                            console.log(`[QuestAutofille] Quest "${questName}" completed!`);
                            doJob();
                        };
                        fn();
                    }
                };
                doJob();
            }
        } catch (err) {
            console.error("[QuestAutofille] Error running plugin logic:", err);
        }
    }

    stop() {
        console.log("[QuestAutofille] Stopped.");
        // Note: Because your script deep-hooks internal store state on start, 
        // full unpatching dynamically on plugin-stop requires refreshing Discord 
        // if patches are currently active mid-quest.
    }
};