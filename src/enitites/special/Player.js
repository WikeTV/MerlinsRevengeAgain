import unitSprites from "../../spriteDefinitions/units.js";
import { immutableCopy } from "../../utils/helper.js";
import { createMagicBlast } from "../projectiles/magic/magicBlast.js";
import { emitMagicThrow } from "../../events/onMagicThrow.js";
import { emitEntitySpawn } from "../../events/onEntitySpawn.js";

const updatePlayerState = function (params) {
    const {
        currentEntityState,
        container,
        userInput,
        scalingMultiplier,
        entities,
        scene,
    } = params;

    const newPlayerState = Object.assign({}, currentEntityState);

    let playerVelocityVector = { x: 0, y: 0 };

    // Movement
    if (userInput.actions.includes("moveUp")) {
        playerVelocityVector.y -= currentEntityState.speed;
    }
    if (userInput.actions.includes("moveLeft")) {
        playerVelocityVector.x -= currentEntityState.speed;
    }
    if (userInput.actions.includes("moveDown")) {
        playerVelocityVector.y += currentEntityState.speed;
    }
    if (userInput.actions.includes("moveRight")) {
        playerVelocityVector.x += currentEntityState.speed;
    }

    playerVelocityVector = currentEntityState.checkWallCollision({
        scene,
        velocityVector: playerVelocityVector,
    });

    // Determine if animation should be walking or standing still
    if (
        userInput.actions.includes("moveUp") ||
        userInput.actions.includes("moveLeft") ||
        userInput.actions.includes("moveDown") ||
        userInput.actions.includes("moveRight")
    ) {
        if (currentEntityState.currentState === "idle") {
            newPlayerState.currentState = "walking";
        }
        if (currentEntityState.currentState === "casting") {
            newPlayerState.currentState = "castingAndWalking";
        }
        if (currentEntityState.currentState === "throwing") {
            newPlayerState.currentState = "throwingAndWalking";
        }
    } else {
        if (currentEntityState.currentState === "walking") {
            newPlayerState.currentState = "idle";
            newPlayerState.animationTimer = 0;
            newPlayerState.frameCount = 0;
        }

        if (currentEntityState.currentState === "castingAndWalking") {
            newPlayerState.currentState = "casting";
        }
        if (currentEntityState.currentState === "throwingAndWalking") {
            newPlayerState.currentState = "throwing";
        }
    }

    // Handle turning the character left
    if (userInput.actions.includes("moveLeft")) {
        newPlayerState.reverseImage = true;
    } else if (userInput.actions.includes("moveRight")) {
        newPlayerState.reverseImage = false;
    }

    // Mouse click
    if (
        userInput.actions.includes("primaryAttack") &&
        currentEntityState.currentState !== "casting" &&
        currentEntityState.currentState !== "castingAndWalking"
    ) {
        newPlayerState.currentState = "casting";
        newPlayerState.animationTimer = 0;
        newPlayerState.frameCount = 0;
    }

    playerVelocityVector = currentEntityState.checkWallCollision({
        scene,
        velocityVector: playerVelocityVector,
    });

    // Set new position based on speed
    newPlayerState.x += playerVelocityVector.x;
    newPlayerState.y += playerVelocityVector.y;

    return immutableCopy(newPlayerState);
};

const handleCastingStateUpdate = (params) => {
    const { currentEntityState, userInput, entities, scalingMultiplier } = params;
    const nextPlayerState = Object.assign({}, updatePlayerState(params));
    // Handle magic casting
    if (
        currentEntityState.currentState === "casting" ||
        currentEntityState.currentState === "castingAndWalking"
    ) {
        // While player holds down the casting button,
        if (userInput.actions.includes("primaryAttack")) {
            if (!currentEntityState.magicEntityId) {
                const newMagic = createMagicBlast({
                    x: currentEntityState.x,
                    y: currentEntityState.y - currentEntityState.baseHeight / 2,
                    team: currentEntityState.team,
                    parentEntityId: currentEntityState.id,
                });
                emitEntitySpawn({ targetEntity: newMagic });
                // Attach newly created object to entity
                Object.assign(nextPlayerState, { magicEntityId: newMagic.id });
            }
        } else {
            // If charge button is released, throw magic
            if (currentEntityState.magicEntityId) {
                emitMagicThrow({
                    sourceEntity: nextPlayerState,
                    targetEntity: entities.find(
                        (ent) => ent.id === currentEntityState.magicEntityId
                    ),
                    targetCoordinate: {
                        x: userInput.mousePosition.x / scalingMultiplier,
                        y: userInput.mousePosition.y / scalingMultiplier,
                    },
                });
            }
            Object.assign(nextPlayerState, {
                currentState: "throwing",
                animationTimer: 0,
                frameCount: 0,
            });
        }
    }

    return nextPlayerState;
};

const Player = (initialValues = {}) => {
    const player = {
        name: "merlin",
        team: "blue",
        z: 2000,
        currentHP: 1000,
        baseWidth: 16,
        baseHeight: 16,
        rotation: 0,
        isWalking: false,
        states: {
            idle: {
                animationFrames: [{ ...unitSprites.frames["WWLK0001.tif"] }],
                updateState: updatePlayerState,
            },
            walking: {
                animationFrames: Array.from(unitSprites.animations["WWLK"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
                updateState: updatePlayerState,
            },
            casting: {
                animationFrames: Array.from(unitSprites.animations["CH"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
                updateState: handleCastingStateUpdate,
            },
            castingAndWalking: {
                animationFrames: Array.from(unitSprites.animations["CW"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
                updateState: handleCastingStateUpdate,
            },
            throwing: {
                onFinish: ({ currentEntityState }) => {
                    const newEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    newEntityState.currentState = "idle";
                    newEntityState.frameCount = 0;
                    return newEntityState;
                },
                animationFrames: Array.from(unitSprites.animations["FI"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
                updateState: updatePlayerState,
            },
            throwingAndWalking: {
                onFinish: ({ currentEntityState }) => {
                    const newEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    newEntityState.currentState = "walking";
                    newEntityState.frameCount = 0;
                    return newEntityState;
                },
                animationFrames: Array.from(unitSprites.animations["FW"]).map(
                    (frameName) => ({ ...unitSprites.frames[frameName] })
                ),
                updateState: updatePlayerState,
            },
        },
        type: "player",
        ...initialValues,
    };

    return immutableCopy(player);
};

export default Player;
