import {
    calculateSceneScalingMultiplier,
    getTileColumnFromPlayfieldX,
    getTileRowFromPlayfieldY,
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
    BASE_VIEW_WIDTH,
    BASE_VIEW_HEIGHT,
} from "../utils/constants.js";
import { getEventManager } from "../events/eventManager.js";
import { getCutsceneManager } from "../cutscenes/cutsceneManager.js";
import { SCENE_EDGE_COLLISION_EVENT_NAME } from "../events/onTransitionEdgeCollision.js";

const overlappingCanvasDisplayStyle = {
    display: "block",
};

const GAME_STATE = {
    // Constants
    isDebugMode: false,
    canDebug: false,
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

    // Stateful variables
    gameMode: "coreGameplay",
    isPaused: false,
    canTransition: false,
    isTransitionArrowsDrawn: false,
    scalingMultiplier: calculateSceneScalingMultiplier(
        document.documentElement
    ),
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
            { entityManager, inputManager, frameRateManager, sceneManager }
        ) => {
            // Entities
            entityManager.clearScreen().drawEntities({
                entities: entityManager.entities,
                ctx: entityManager.ctx,
                scalingMultiplier: gameState.scalingMultiplier,
                showHitbox: gameState.isDebugMode, //? DEBUG: show entity hitboxes
            });

            // Scene transition arrows should render once to background canvas, if there are no enemies left alive in this scene
            if (gameState.canTransition && !gameState.isTransitionArrowsDrawn) {
                sceneManager?.drawTransitionArrows();
            }

            // //? DEBUG: status text to show various current game state values
            if (gameState.isDebugMode) {
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
                drawStatusText(
                    ctx,
                    "Player Position: " +
                        "x: " +
                        player?.x +
                        ", y: " +
                        player?.y,
                    5
                );
                drawStatusText(
                    ctx,
                    "Transition Active: " +
                        (gameState.canTransition ? "True" : "False"),
                    6
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
            const currentInputActions = inputManager.getActivatedActions();

            //? Check if all enemies in scene are dead, and if so, allow transition to neighboring scenes
            if (
                !lastState.canTransition &&
                gameManagers?.entityManager?.entities?.find(
                    (ent) => ent.type === "Player"
                ) &&
                !gameManagers?.entityManager?.entities?.some(
                    (ent) => !ent.isDead && ent.team !== "blue"
                )
            ) {
                nextGameState.canTransition = true;
                nextGameState.isTransitionArrowsDrawn = false;
            }

            // Check if DEBUG info can and should be toggled
            if (
                currentPressedInputs.includes("KeyI") &&
                currentGameState.canDebug
            ) {
                nextGameManagers.inputManager.acknowledgeInput("KeyI");
                nextGameState.isDebugMode = !currentGameState.isDebugMode;
                console.log(
                    "Debug mode " +
                        (nextGameState.isDebugMode ? "enabled" : "disabled")
                );
            }

            if (lastState.canTransition && !lastState.isTransitionArrowsDrawn) {
                nextGameManagers.sceneManager.drawTransitionArrows();
                nextGameState.isTransitionArrowsDrawn = true;
            }

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
                    console.log({ nextGameState });
                    nextGameState.isPaused = true;
                }
            }

            // Paused game loops here, to prevent state updates from being saved, while
            // still allowing user interaction with pause menu, and update of DEBUG info.
            if (nextGameState.isPaused) {
                //TODO: render "Paused" overlay text
                return { nextGameState, nextGameManagers };
            } else {
                //! Below code will only execute when the game is unpaused
                const events = eventManager.snapshotPendingEvents();

                // Check for scene transitions via edge collision event
                const transitionEvent = events?.find(
                    (event) => event.name === SCENE_EDGE_COLLISION_EVENT_NAME
                );

                if (transitionEvent) {
                    // Whether transition is allowed or not, acknowledge to clear the event
                    nextGameManagers.eventManager.acknowledgeEvent(
                        transitionEvent?.id
                    );
                    // Logic gating could be better here, but the idea is exit as soon as a check fails
                    if (lastState.canTransition) {
                        // Initiate scene transition
                        const { direction, positionCoordinates } =
                            transitionEvent;
                        const tileX = getTileColumnFromPlayfieldX(
                            positionCoordinates.x
                        );
                        const tileY = getTileRowFromPlayfieldY(
                            positionCoordinates.y
                        );

                        const canTransitionHere =
                            sceneManager.transitionTiles.some(
                                (tile) => tile.x === tileX && tile.y === tileY
                            );

                        // Tile transition boundary check
                        if (canTransitionHere) {
                            //TODO: save previous scene entity state

                            // Load new scene
                            nextGameManagers.sceneManager =
                                nextGameManagers.sceneManager.loadAdjacentScene(
                                    { direction, entityManager }
                                );
                            // Spawn entities for new scene

                            // Start by snapshotting the player entity's state, and translating coordinates to the opposite edge
                            const playerEntity =
                                gameManagers.entityManager.entities.find(
                                    (ent) => ent.type === "Player"
                                );
                            const newPlayerCoordinates = {
                                x: positionCoordinates.x,
                                y: positionCoordinates.y,
                            };
                            switch (direction) {
                                case "left":
                                    newPlayerCoordinates.x =
                                        BASE_VIEW_WIDTH -
                                        playerEntity.baseWidth / 2 -
                                        1;
                                    break;
                                case "right":
                                    newPlayerCoordinates.x =
                                        playerEntity.baseWidth / 2 + 1;
                                    break;
                                case "up":
                                    newPlayerCoordinates.y =
                                        BASE_VIEW_HEIGHT -
                                        playerEntity.baseHeight / 2 -
                                        1;
                                    break;
                                case "down":
                                    newPlayerCoordinates.y =
                                        playerEntity.baseHeight / 2 + 1;
                                    break;
                            }

                            // Spawn entities for new scene, and copy player entity from previous scene to new coordinates
                            nextGameManagers.entityManager = getEntityManager({
                                entityCanvas: nextGameState.entityCanvasElement,
                                scene: nextGameManagers.sceneManager
                                    .currentScene,
                            })
                                .spawnSceneEntities()
                                .spawnPlayerEntity({
                                    playerEntityValues: {
                                        ...playerEntity,
                                        ...newPlayerCoordinates,
                                    },
                                });

                            nextGameState.canTransition = false;
                            nextGameState.isTransitionArrowsDrawn = false;

                            nextGameManagers.sceneManager.drawScene();

                            return { nextGameState, nextGameManagers };
                        }
                    }
                }

                // Run individual entity logic on each loop
                nextGameManagers.entityManager = entityManager
                    .despawnEntities((ent) => ent.shouldDespawn)
                    .updateEntities({
                        userInput: currentInputActions,
                        scalingMultiplier: currentGameState.scalingMultiplier,
                    })
                    // Process queued events
                    .processEvents(events, {
                        onSuccess: (event) =>
                            nextGameManagers.eventManager.acknowledgeEvent(
                                event.id
                            ),
                    });

                nextGameManagers.eventManager.removeAcknowledgedEvents();

                //! TEMP
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

                // // Check for scene transition
                // if (gameState.canTransition && nextGameState.gameMode && checkPlayerIsAtSceneEdge({ player})) {
                //     const { sceneToLoad } = handleSceneTransition({

                //     });
                // }

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

/**
 * Initializes and returns the main game manager, which handles the main game loop and state.
 * @param {Object} options - Configuration options for the game manager.
 * @param {boolean} options.canDebug - Whether debug mode can be enabled via keybind.
 * @returns {Object} The game manager with the main loop function.
 */
export const getGameManager = async (options = {}) => {
    initialGameState.canDebug = Boolean(options.canDebug);

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
        gameManagers = startingGameManagers,
        animationState = {}
    ) => {
        let gameModeFunctions = gameModes[lastState.gameMode];
        let { nextGameState, nextGameManagers } =
            await gameModeFunctions.update(lastState, gameManagers);

        if (nextGameState?.gameMode !== lastState?.gameMode) {
            gameModeFunctions = gameModes[nextGameState.gameMode];
            const newGameModeManagers = await gameModeFunctions.initialize(
                nextGameState,
                globalGameManagers
            );
            Object.assign(nextGameManagers, newGameModeManagers);
        }

        // Handle viewport resize (using 2% threshold to avoid excessive resizing)
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
        requestAnimationFrame(() =>
            gameModeFunctions.animate(nextGameState, nextGameManagers)
        );
    };

    return immutableCopy({ ...initialGameState, loop });
};
