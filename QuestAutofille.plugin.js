/**
 * @name QuestAutofille
 * @author Mak0Dev
 * @description Automatically manages Discord Quests
 * @version 1.0.1 Fix
 * @website https://github.com/Mak0Dev/QuestAutofille
 */

module.exports = class QuestAutofille {

    start() {

        console.log("[QuestAutofille] Starting...");

        try {

            if (window.$) {
                delete window.$;
            }


            let wpRequire = webpackChunkdiscord_app.push([
                [Symbol()],
                {},
                r => r
            ]);

            webpackChunkdiscord_app.pop();


            const findModule = (filter) => {

                return Object.values(wpRequire.c)
                    .find(x => filter(x))?.exports;

            };


            let RunningGameStore;
            let QuestsStore;
            let ChannelStore;
            let GuildChannelStore;
            let FluxDispatcher;
            let ApplicationStreamingStore;
            let api;



            ApplicationStreamingStore =
                findModule(x =>
                    x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata
                )?.Z;


            RunningGameStore =
                findModule(x =>
                    x?.exports?.ZP?.getRunningGames
                )?.ZP ||
                findModule(x =>
                    x?.exports?.Ay?.getRunningGames
                )?.Ay;



            QuestsStore =
                findModule(x =>
                    x?.exports?.Z?.__proto__?.getQuest
                )?.Z ||
                findModule(x =>
                    x?.exports?.A?.__proto__?.getQuest
                )?.A;



            ChannelStore =
                findModule(x =>
                    x?.exports?.Z?.__proto__?.getAllThreadsForParent
                )?.Z;



            GuildChannelStore =
                findModule(x =>
                    x?.exports?.ZP?.getSFWDefaultChannel
                )?.ZP;



            FluxDispatcher =
                findModule(x =>
                    x?.exports?.Z?.__proto__?.flushWaitQueue
                )?.Z;



            api =
                findModule(x =>
                    x?.exports?.tn?.get
                )?.tn ||
                findModule(x =>
                    x?.exports?.Bo?.get
                )?.Bo;



            if (!QuestsStore || !api) {

                console.error(
                    "[QuestAutofille] Discord modules not found"
                );

                return;

            }



            const supportedTasks = [
                "WATCH_VIDEO",
                "WATCH_VIDEO_ON_MOBILE",
                "PLAY_ON_DESKTOP",
                "STREAM_ON_DESKTOP",
                "PLAY_ACTIVITY"
            ];



            let quests = [
                ...QuestsStore.quests.values()
            ].filter(q => {


                const taskConfig =
                    q?.config?.taskConfig ??
                    q?.config?.taskConfigV2;



                return (

                    q?.userStatus?.enrolledAt &&

                    !q?.userStatus?.completedAt &&

                    q?.config?.expiresAt &&

                    new Date(q.config.expiresAt)
                        .getTime() > Date.now() &&

                    taskConfig?.tasks &&

                    supportedTasks.some(
                        t =>
                        taskConfig.tasks[t]
                    )

                );

            });



            console.log(
                `[QuestAutofille] Found ${quests.length} quests`
            );



            if (!quests.length) {

                console.log(
                    "[QuestAutofille] No quests"
                );

                return;

            }



            const isApp =
                typeof DiscordNative !== "undefined";




            const doJob = async () => {


                const quest = quests.pop();


                if (!quest) {

                    console.log(
                        "[QuestAutofille] Finished all quests"
                    );

                    return;

                }



                const questName =
                    quest?.config?.messages?.questName ??
                    "Unknown Quest";



                const applicationId =
                    quest?.config?.application?.id;



                const applicationName =
                    quest?.config?.application?.name ??
                    "Unknown";



                const taskConfig =
                    quest.config.taskConfig ??
                    quest.config.taskConfigV2;



                const taskName =
                    supportedTasks.find(
                        t =>
                        taskConfig.tasks[t]
                    );



                if (!taskName) {

                    console.log(
                        "[QuestAutofille] Invalid task:",
                        questName
                    );

                    return doJob();

                }



                const secondsNeeded =
                    taskConfig.tasks[taskName].target;



                let secondsDone =
                    quest.userStatus
                    ?.progress
                    ?.[taskName]
                    ?.value ?? 0;




                console.log(
                    `[QuestAutofille] ${questName}`
                );



                /*
                    VIDEO QUEST
                */

                if (
                    taskName === "WATCH_VIDEO" ||
                    taskName === "WATCH_VIDEO_ON_MOBILE"
                ) {



                    while(secondsDone < secondsNeeded) {


                        await api.post({

                            url:
                            `/quests/${quest.id}/video-progress`,

                            body: {

                                timestamp:
                                Math.min(
                                    secondsNeeded,
                                    secondsDone + 10
                                )

                            }

                        });



                        secondsDone += 10;



                        console.log(
                            `[QuestAutofille]
                            ${secondsDone}/${secondsNeeded}`
                        );



                        await new Promise(
                            r =>
                            setTimeout(r,1500)
                        );


                    }



                    console.log(
                        `[QuestAutofille] Completed ${questName}`
                    );


                    return doJob();

                }






                /*
                    DESKTOP GAME
                */


                if(taskName==="PLAY_ON_DESKTOP"){


                    if(!isApp){

                        console.log(
                            "[QuestAutofille] Desktop app required"
                        );

                        return doJob();

                    }



                    if(!applicationId){

                        console.log(
                            "[QuestAutofille] Missing application id"
                        );

                        return doJob();

                    }



                    console.log(
                        `[QuestAutofille] Spoofing ${applicationName}`
                    );



                    let pid =
                    Math.floor(
                        Math.random()*50000
                    );



                    let fakeGame = {


                        cmdLine:
                        `C:\\Program Files\\${applicationName}\\game.exe`,

                        exeName:
                        "game.exe",

                        exePath:
                        "game.exe",

                        hidden:false,

                        id:
                        applicationId,

                        name:
                        applicationName,

                        pid,

                        pidPath:[pid],

                        processName:
                        applicationName,

                        start:
                        Date.now()

                    };



                    let old =
                    RunningGameStore.getRunningGames;



                    RunningGameStore.getRunningGames =
                    () => [fakeGame];



                    FluxDispatcher.dispatch({

                        type:
                        "RUNNING_GAMES_CHANGE",

                        removed:[],

                        added:[fakeGame],

                        games:[fakeGame]

                    });



                    const listener =
                    data => {


                        let progress =
                        Math.floor(
                            data.userStatus
                            ?.progress
                            ?.PLAY_ON_DESKTOP
                            ?.value ?? 0
                        );



                        console.log(
                            `[QuestAutofille]
                            ${progress}/${secondsNeeded}`
                        );



                        if(progress >= secondsNeeded){


                            RunningGameStore
                            .getRunningGames =
                            old;



                            FluxDispatcher.unsubscribe(
                                "QUESTS_SEND_HEARTBEAT_SUCCESS",
                                listener
                            );


                            console.log(
                                `[QuestAutofille] Completed ${questName}`
                            );


                            doJob();

                        }


                    };



                    FluxDispatcher.subscribe(
                        "QUESTS_SEND_HEARTBEAT_SUCCESS",
                        listener
                    );



                    return;

                }




                console.log(
                    "[QuestAutofille] Unsupported:",
                    taskName
                );


                doJob();


            };



            doJob();


        }
        catch(e){

            console.error(
                "[QuestAutofille] Error:",
                e
            );

        }

    }



    stop(){

        console.log(
            "[QuestAutofille] Stopped"
        );

    }

};
