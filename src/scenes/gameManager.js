import {
    calculateSceneScalingMultiplier,
    rescaleElement,
} from "../utils/scaling.js";
import { getSceneManager } from "./sceneManager.js";
import { immutableCopy } from "../utils/helper.js";
import { getEntityManager } from "../enitites/entityManager.js";
import { getFramerateTracker } from "../utils/framerateTracker.js";
import { getInputManager } from "../utils/inputManager.js";
import { drawStatusText } from "../utils/textRender.js";
import {
    TARGET_FRAMERATE,
    MILLISECONDS_PER_FRAME,
} from "../utils/constants.js";
import { getEventManager } from "../events/eventManager.js";
import { getCutsceneManager } from "../cutscenes/cutsceneManager.js";

const overlappingCanvasDisplayStyle = {
    display: "block",
};

const GAME_STATE = {
    isDevMode: false,
    gameMode: "coreGameplay",
    isPaused: false,
    scalingMultiplier: calculateSceneScalingMultiplier(
        document.documentElement
    ),
    loadingHeading: document.getElementById("loading"),
    canvasContainer: document.getElementById("canvas-container"),
    overlayCanvasElement: document.getElementById("canvas-overlay"),
    entityCanvasElement: document.getElementById("canvas-foreground"),
    backgroundCanvasElement: document.getElementById("canvas-background"),
    rescaleCanvases(scalingMultiplierOverride) {
        rescaleElement(
            this.canvasContainer,
            scalingMultiplierOverride ?? this.scalingMultiplier
        );
        rescaleElement(
            this.overlayCanvasElement,
            scalingMultiplierOverride ?? this.scalingMultiplier
        );
        rescaleElement(
            this.entityCanvasElement,
            scalingMultiplierOverride ?? this.scalingMultiplier
        );
        rescaleElement(
            this.backgroundCanvasElement,
            scalingMultiplierOverride ?? this.scalingMultiplier
        );
    },
};

const initialGameState = Object.assign({}, GAME_STATE);

const gameModes = {
    coreGameplay: {
        initialize: async (gameState, globalManagers) => {
            // ----------------------
            // Init event listeners
            // ----------------------
            const eventManager = getEventManager(gameState.canvasContainer);

            // Initialize background canvas and background scene manager
            const sceneManager = await getSceneManager({
                tileDisplayCanvasElement: gameState.backgroundCanvasElement,
            })
                .resizeCanvas({
                    scalingMultiplier: gameState.scalingMultiplier,
                    style: overlappingCanvasDisplayStyle,
                })
                .loadMap("maps/mr1.json");

            // Initialize entity manager
            const entityManager = getEntityManager({
                entityCanvas: gameState.entityCanvasElement,
                scene: sceneManager.currentScene,
            }).spawnSceneEntities();

            return {
                ...globalManagers,
                eventManager,
                sceneManager,
                entityManager,
            };
        },
        cleanup: () => {},
        // Callback function to render current map and entities to screen
        animate: async (
            gameState,
            { entityManager, inputManager, frameRateManager }
        ) => {
            // Entities
            entityManager.clearScreen().drawEntities({
                entities: entityManager.entities,
                ctx: entityManager.ctx,
                scalingMultiplier: gameState.scalingMultiplier,
                showHitbox: gameState.isDevMode,
            });

            // //? DEV: status text to show various current game state values
            if (gameState.isDevMode) {
                const currentPressedInputs = inputManager.getPressedInputs();
                const currentInputActions =
                    inputManager.getActivatedActions().actions;
                const ctx = gameState.entityCanvasElement.getContext("2d");
                const player = entityManager.entities.find(
                    (ent) => ent.name === "merlin"
                );
                drawStatusText(
                    ctx,
                    "FPS: " + frameRateManager.currentFrameRate,
                    1
                );
                drawStatusText(
                    ctx,
                    "Inputs: " + currentPressedInputs.join(", "),
                    2
                );
                drawStatusText(
                    ctx,
                    "Actions: " + currentInputActions.join(", "),
                    3
                );
                drawStatusText(
                    ctx,
                    "Player HP: " + (player ? player.currentHP : "DEAD"),
                    4
                );
            }
        },
        // Callback function to handle updating the game state each frame
        update: async (lastState, gameManagers) => {
            const currentGameState = immutableCopy(
                lastState ?? initialGameState
            );
            const nextGameState = Object.assign(
                {},
                lastState ?? initialGameState
            );
            const nextGameManagers = Object.assign({}, gameManagers);

            const { eventManager, inputManager, entityManager, sceneManager } =
                gameManagers;

            const currentPressedInputs = inputManager.getPressedInputs();
            const currentInputActions =
                inputManager.getActivatedActions();

            // Pause and unpause the game when "Escape" is pressed
            if (
                nextGameState.gameMode === "coreGameplay" &&
                currentPressedInputs.includes("Escape")
            ) {
                nextGameManagers.inputManager.acknowledgeInput("Escape");
                if (currentGameState.isPaused) {
                    console.log("Unpause");
                    nextGameState.isPaused = false;
                } else {
                    console.log("Pause");
                    nextGameState.isPaused = true;
                }
            }
            if (nextGameState.isPaused) {
                return { nextGameState, nextGameManagers };
            } else {
                //! While game is paused, the below code will NOT execute

                // Run individual entity logic on each loop
                nextGameManagers.entityManager = entityManager
                    .despawnEntities((ent) => ent.shouldDespawn)
                    .updateEntities({
                        userInput: currentInputActions,
                        scalingMultiplier: currentGameState.scalingMultiplier,
                    })
                    // Process events that are queued from the last iteration
                    .processEvents(eventManager.snapshotPendingEvents(), {
                        onSuccess: (event) =>
                            nextGameManagers.eventManager.acknowledgeEvent(
                                event.id
                            ),
                    });

                nextGameManagers.eventManager.removeAcknowledgedEvents();

                // When player dies, play the "wasted" cutscene, then restart the game
                const player = entityManager.entities.find(
                    (ent) => ent.name === "merlin"
                );
                if (
                    nextGameManagers?.entityManager?.entities?.length !==
                        undefined &&
                    !player
                ) {
                    nextGameState.gameMode = "cutscene";
                    nextGameState.cutsceneName = "wasted";
                }

                //! DEV debug
                if (
                    currentPressedInputs.includes("AltLeft") &&
                    currentPressedInputs.includes("KeyX") &&
                    JSON.stringify(currentGameState) !==
                        JSON.stringify(nextGameState)
                ) {
                    console.log(
                        "inputs",
                        currentPressedInputs,
                        "actions",
                        currentInputActions
                    );
                    console.log("states", currentGameState, nextGameState);
                    console.log(
                        "entites",
                        entityManager.entities,
                        nextGameManagers.entityManager.entities
                    );
                }
                //!

                return { nextGameState, nextGameManagers };
            }
        },
    },
    mainMenu: {
        initialize: () => {},
        cleanup: () => {},
        animate: () => {},
        update: async (lastState) => {},
    },
    cutscene: {
        initialize: async (gameState, globalManagers) => {
            console.log();
            const cutsceneManager = await getCutsceneManager({
                cutsceneName: gameState.cutsceneName,
                overlayCanvas: gameState.overlayCanvasElement,
                foregroundCanvas: gameState.entityCanvasElement,
                backgroundCanvas: gameState.backgroundCanvasElement,
            });
            console.log({ cutsceneManager });
            return { ...globalManagers, cutsceneManager };
        },
        cleanup: (gameState, managers) => {
            const newGameManager = Object.assign(
                gameState,
                getGameManager(...gameState)
            );

            const nextGameManagers = Object.assign({}, managers);

            return { nextGameState: newGameManager, nextGameManagers };
        },
        animate: (gameState, { cutsceneManager }) => {
            cutsceneManager.drawFrame(cutsceneManager);
        },
        update: async (lastState, managers) => {
            const nextGameState = Object.assign({}, lastState);
            const nextGameManagers = Object.assign({}, managers);
            const nextCutsceneManager = managers.cutsceneManager.advanceFrame(
                managers.cutsceneManager
            );
            nextGameManagers.cutsceneManager = nextCutsceneManager;

            if (nextCutsceneManager.stage.isFinished) {
                nextGameState.gameMode = "coreGameplay";
            }

            return { nextGameState, nextGameManagers };
        },
    },
};

export const getGameManager = async (options = {}) => {
    initialGameState.isDevMode = Boolean(options.isDevMode);

    // Remove loading placeholder
    initialGameState.loadingHeading.style.display = "none";

    // Initialize canvas size and center elements within container
    initialGameState.rescaleCanvases();

    Object.assign(
        initialGameState.entityCanvasElement.style,
        overlappingCanvasDisplayStyle
    );

    // Initialize globally-available managers:

    // Input tracker
    const inputManager = getInputManager(initialGameState.entityCanvasElement);

    // Framerate tracker
    const frameRateManager = getFramerateTracker();

    const globalGameManagers = {
        frameRateManager,
        inputManager,
    };

    // Initialize first gameMode state
    let startingGameManagers = await gameModes[
        initialGameState.gameMode
    ].initialize(initialGameState, globalGameManagers);

    // Main loop
    const loop = async (
        lastState = initialGameState,
        gameManagers = startingGameManagers
    ) => {
        let gameModeFunctions = gameModes[lastState.gameMode];
        const { nextGameState, nextGameManagers } =
            await gameModeFunctions.update(lastState, gameManagers);

        if (nextGameState?.gameMode !== lastState?.gameMode) {
            gameModeFunctions = gameModes[nextGameState.gameMode];
            const newGameModeManagers = await gameModeFunctions.initialize(
                nextGameState,
                globalGameManagers
            );
            Object.assign(nextGameManagers, newGameModeManagers);
        }

        // Handle viewport resize
        // if container size has increased by more than 2%, increase canvas size
        // if container size has decreased below canvas size, decrease canvas size to 98% of container width
        //      - this protects against the container being slightly too small for the game display
        let newScale = calculateSceneScalingMultiplier();
        if (
            newScale < lastState.scalingMultiplier ||
            newScale - newScale * 0.02 > lastState.scalingMultiplier
        ) {
            // Old scale not within .2 of new scale
            nextGameState.scalingMultiplier =
                newScale < lastState.scalingMultiplier
                    ? newScale * 0.98
                    : newScale;

            nextGameState.rescaleCanvases(nextGameState.scalingMultiplier); // entity canvas and container element
            nextGameManagers.sceneManager =
                gameManagers.sceneManager.resizeCanvas({
                    scalingMultiplier: nextGameState.scalingMultiplier,
                }); // bottom canvas (tiles)
        }

        // Calculate current frameRate
        nextGameManagers.frameRateManager =
            gameManagers.frameRateManager.calculateFrameRate();

        // Setup next iteration of the loop
        window.setTimeout(
            () => loop(nextGameState, nextGameManagers),
            MILLISECONDS_PER_FRAME
        ); // Timeout derived from TARGET_FRAMERATE

        // Draw current state to display
        requestAnimationFrame(() => {
            gameModeFunctions.animate(nextGameState, nextGameManagers);
        });
    };

    return immutableCopy({ ...initialGameState, loop });
};
