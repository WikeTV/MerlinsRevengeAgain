import {
    getTileColumnFromPlayfieldX,
    getTileRowFromPlayfieldY,
} from "../utils/scaling.js";
import {
    BASE_VIEW_HEIGHT,
    BASE_VIEW_WIDTH,
    GRID_MAX_X_INDEX,
    GRID_MAX_Y_INDEX,
    BASE_MOVE_SPEED,
    ENTITY_CORE_FIELDS,
} from "../utils/constants.js";
import {
    convertToArray,
    generateUUID,
    immutableCopy,
} from "../utils/helper.js";
import unitSprites from "../spriteDefinitions/units.js";
import { Vector2D } from "../utils/Vector2D.js";

/**
 * Takes all enumerable properties of an object and converts them into a set of
 * "data descriptors" for use in Object.defineProperties(), or Object.create().
 *
 * This is not used much, since Object.assign() is generally easier,
 * and JS inheritance is not reliable or consistent.
 *
 * @param {*} object The JS object to get data descriptors for
 * @returns propertiesObject (second parameter for Object.create())
 */
export const mapOwnProperties = (object) => {
    let propertyMap = Object.fromEntries(
        Object.entries(object).map(([propName, propValue]) => [
            propName,
            {
                value: propValue,
                enumerable: true,
                writable: true,
                configurable: true,
            },
        ])
    );
    return propertyMap;
};

export const getHitboxBounds = (entity) => {
    return {
        x1: entity.x - entity.baseWidth / 2,
        y1: entity.y - entity.baseHeight / 2,
        x2: entity.x + entity.baseWidth / 2,
        y2: entity.y + entity.baseHeight / 2,
    };
};

export const teams = ["blue", "black", "green", "grey"];

// Default field values for an entity object
const DEFAULT_ENTITY = Object.freeze({
    // spriteSheet: document.getElementById("character-sprites"),
    id: null,
    x: 0,
    y: 0,
    z: 0,
    baseWidth: 16,
    baseHeight: 16,
    reverseImage: false, // Tells spriteRender to flip the sprite horizontally
    rotation: 0, // 360 degree sprite rotation about the center point
    collisionCenterOffset: { x: 0, y: 0, w: null, h: null }, // Hitbox bounds of entity (point or rectangle offset from center)
    states: {
        idle: {
            animationFrames: Array.from(unitSprites.animations["Bmfi"]).map(
                (frameName) => ({ ...unitSprites.frames[frameName] })
            ),
            updateState: ({ currentEntityState }) => {
                return immutableCopy(currentEntityState);
            },
        },
    },
    currentState: "idle",
    currentHP: 1000,
    isDead: false,
    frameCount: 0,
    animationTimer: 0,
    team: teams[0],
    speed: BASE_MOVE_SPEED,
    type: "",
    spriteSheetId: "character-sprites", // Should be a valid ID of an existing <img> element in the DOM
    spriteSheet: undefined, // Should be a reference to an <img> element in the DOM
    visualModifiers: {
        stretchX: 1,
        stretchY: 1,
        opacity: 1,
    },
    draw({ context, scalingMultiplier, showHitbox }) {
        // Do not draw entities that are supposed to despawn
        if (this.shouldDespawn === true) {
            return;
        }
        const currentAnimationStateObject = this.states[this.currentState];

        const currentFrame =
            currentAnimationStateObject.animationFrames[
                Math.floor(this.frameCount ?? 0)
            ];
        const { x: sx, y: sy, w: sw, h: sh } = currentFrame.frame;
        let scaledX = this.x * scalingMultiplier;
        let scaledY = this.y * scalingMultiplier;
        let spriteWidth = (this?.baseWidth ?? sw) * scalingMultiplier;
        let spriteHeight = (this.baseHeight ?? sh) * scalingMultiplier;

        context.save();

        // Hitbox visualization
        if (showHitbox) {
            context.strokeStyle = "red";
            context.strokeRect(
                scaledX - spriteWidth / 2,
                scaledY - spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            context.strokeStyle = "black";
        }

        // Apply visual modifiers
        context.globalAlpha = this.visualModifiers.opacity;

        // Center context on sprite in spritesheet
        context.translate(scaledX, scaledY);

        // Apply sprite rotation
        context.rotate(((this.rotation ?? 0) * Math.PI) / 180);

        // Apply horizontal flip
        if (this.reverseImage) {
            context.scale(-1, 1);
        }
        if (currentAnimationStateObject.isReversed) {
            context.scale(-1, 1);
        }

        // Source image coordinates
        const source = [sx, sy, sw, sh];

        // Start coordinates and size dimensions of image destination on canvas
        // Apply image stretching here
        const destination = [
            ((this.reverseImage ? spriteWidth : -1 * spriteWidth) *
                this.visualModifiers.stretchX) /
                2,
            (-1 * spriteHeight * this.visualModifiers.stretchY) / 2,
            (this.reverseImage ? -1 * spriteWidth : spriteWidth) *
                this.visualModifiers.stretchX,
            spriteHeight * this.visualModifiers.stretchY,
        ];

        // Render sprite to canvas
        // image element, spriteLocationX, spriteLocationY, spriteWidth, spriteHeight, canvasPositionX, canvasPositionY, drawWidth, drawHeight
        context.drawImage(this.spriteSheet, ...source, ...destination);

        // if (
        //     Math.floor(this.frameCount) <
        //     currentAnimationStateObject.animationFrames.length - 1
        // ) {
        //     this.frameCount +=
        //         currentAnimationStateObject.animationSpeed ?? 0.2; // Default animation speed will be 5 frames per image
        // } else {
        //     this.frameCount = 0;
        //     if (currentAnimationStateObject?.onFinish) {
        //         currentAnimationStateObject.onFinish(this);
        //     }
        //     if (currentAnimationStateObject?.noLoop) {
        //         this.animationTimer = 0;
        //         this.currentAnimationState =
        //             currentAnimationStateObject?.noLoop;
        //     }
        // }
        context.restore();
    },
    checkWallCollision({ scene, velocityVector }) {
        let {
            x: currentCenterX,
            y: currentCenterY,
            baseWidth,
            baseHeight,
        } = this;

        let desiredNewX = currentCenterX + velocityVector.x;
        let desiredNewY = currentCenterY + velocityVector.y;

        // Prevent entity from running outside the map bounds
        if (desiredNewX - baseWidth / 2 < 0) {
            velocityVector.x = 0; // + player.baseWidth / 2;
        }
        if (desiredNewY - baseHeight / 2 < 0) {
            velocityVector.y = 0;
        }
        if (desiredNewX + baseWidth / 2 > BASE_VIEW_WIDTH) {
            velocityVector.x = 0;
        }
        if (desiredNewY + baseHeight / 2 > BASE_VIEW_HEIGHT) {
            velocityVector.y = 0;
        }

        // Get tiles in adjacent squares (no corners)

        const expectedPlayerCoordinates = {
            leftCenter: desiredNewX - baseWidth / 2,
            rightCenter: desiredNewX + baseWidth / 2,
            topCenter: desiredNewY - baseHeight / 2,
            bottomCenter: desiredNewY + baseHeight / 2,
        };

        let expectedPlayerTileGridCoordinates = {
            left: getTileColumnFromPlayfieldX(
                expectedPlayerCoordinates.leftCenter
            ),
            right: getTileColumnFromPlayfieldX(
                expectedPlayerCoordinates.rightCenter
            ),
            top: getTileRowFromPlayfieldY(expectedPlayerCoordinates.topCenter),
            bottom: getTileRowFromPlayfieldY(
                expectedPlayerCoordinates.bottomCenter
            ),
            x: getTileColumnFromPlayfieldX(desiredNewX),
            y: getTileRowFromPlayfieldY(desiredNewY),
        };

        const currentPlayerTileGridCoordinates = {
            left: getTileColumnFromPlayfieldX(currentCenterX - baseWidth / 2),
            right: getTileColumnFromPlayfieldX(currentCenterX + baseWidth / 2),
            top: getTileRowFromPlayfieldY(currentCenterY - baseHeight / 2),
            bottom: getTileRowFromPlayfieldY(currentCenterY + baseHeight / 2),
            x: getTileColumnFromPlayfieldX(currentCenterX),
            y: getTileColumnFromPlayfieldX(currentCenterY),
        };

        // For each adjacent grid square, if it contains a foreground tile, and player hitbox plane has overlapped, prevent player from moving that direction.
        const isTileAbove =
            currentPlayerTileGridCoordinates.y >= 1
                ? Boolean(
                      scene.foregroundTiles[
                          currentPlayerTileGridCoordinates.left
                      ][currentPlayerTileGridCoordinates.y - 1] ||
                          scene.foregroundTiles[
                              currentPlayerTileGridCoordinates.right
                          ][currentPlayerTileGridCoordinates.y - 1]
                  )
                : true;
        const isTileBelow =
            currentPlayerTileGridCoordinates.y < GRID_MAX_Y_INDEX
                ? Boolean(
                      scene.foregroundTiles[
                          currentPlayerTileGridCoordinates.right
                      ][currentPlayerTileGridCoordinates.y + 1] ||
                          scene.foregroundTiles[
                              currentPlayerTileGridCoordinates.left
                          ][currentPlayerTileGridCoordinates.y + 1]
                  )
                : true;
        const isTileLeft =
            currentPlayerTileGridCoordinates.x >= 1
                ? Boolean(
                      scene.foregroundTiles[
                          currentPlayerTileGridCoordinates.x - 1
                      ][currentPlayerTileGridCoordinates.top] ||
                          scene.foregroundTiles[
                              currentPlayerTileGridCoordinates.x - 1
                          ][currentPlayerTileGridCoordinates.bottom]
                  )
                : true;
        const isTileRight =
            currentPlayerTileGridCoordinates.x < GRID_MAX_X_INDEX
                ? Boolean(
                      scene.foregroundTiles[
                          currentPlayerTileGridCoordinates.x + 1
                      ][currentPlayerTileGridCoordinates.top] ||
                          scene.foregroundTiles[
                              currentPlayerTileGridCoordinates.x + 1
                          ][currentPlayerTileGridCoordinates.bottom]
                  )
                : true;

        if (
            isTileAbove &&
            velocityVector.y < 0 &&
            expectedPlayerTileGridCoordinates.top <
                expectedPlayerTileGridCoordinates.y
        ) {
            velocityVector.y = 0;
        }
        if (
            isTileBelow &&
            velocityVector.y > 0 &&
            expectedPlayerTileGridCoordinates.bottom >
                expectedPlayerTileGridCoordinates.y
        ) {
            velocityVector.y = 0;
        }
        if (
            isTileLeft &&
            velocityVector.x < 0 &&
            expectedPlayerTileGridCoordinates.left <
                expectedPlayerTileGridCoordinates.x
        ) {
            velocityVector.x = 0;
        }
        if (
            isTileRight &&
            velocityVector.x > 0 &&
            expectedPlayerTileGridCoordinates.right >
                expectedPlayerTileGridCoordinates.x
        ) {
            velocityVector.x = 0;
        }

        // Use a vector to check for collision in between current location and destination
        const movementPath = new Vector2D(
            { x: currentCenterX, y: currentCenterY },
            { x: desiredNewX, y: desiredNewY }
        );

        return velocityVector;
    },
    update: ({ currentEntityState, container, ...params }) => {
        // Despawn self when HP reaches 0 (`null`, `undefined`, or negative numeric "currentHP" will not trigger a despawn)
        if (
            currentEntityState.currentState !== "recoil" &&
            currentEntityState.currentState !== "ghost" &&
            currentEntityState.currentHP === 0
        ) {
            return [
                immutableCopy(
                    Object.assign({}, currentEntityState, {
                        shouldDespawn: true,
                    })
                ),
            ];
        }
        const currentStateObject =
            currentEntityState.states[currentEntityState.currentState] ??
            currentEntityState.states["idle"] ??
            Object.values(currentEntityState.states)?.[0] ??
            null;
        const updateStateReturnValue =
            currentStateObject?.updateState?.({
                currentEntityState,
                ...params,
            }) ?? currentEntityState;

        let newEntityAndSpawn = convertToArray(updateStateReturnValue);

        // Update currently displayed animationFrame
        newEntityAndSpawn[0].frameCount =
            currentEntityState.currentState ===
            newEntityAndSpawn[0].currentState
                ? currentEntityState.frameCount + 0.2
                : newEntityAndSpawn[0].frameCount; // 0.2 means each sprite lasts for 5 frames

        // Keep track of how many state update iterations this currentState has lasted for
        newEntityAndSpawn[0].animationTimer =
            currentEntityState.currentState ===
            newEntityAndSpawn[0].currentState
                ? currentEntityState.animationTimer + 1
                : 0;
        if (
            newEntityAndSpawn[0].frameCount + 0.2 >
            currentStateObject.animationFrames.length
        ) {
            newEntityAndSpawn[0].frameCount = 0;
            newEntityAndSpawn = newEntityAndSpawn.concat(
                convertToArray(
                    currentStateObject.onFinish?.({
                        currentEntityState: newEntityAndSpawn[0],
                    }) ?? newEntityAndSpawn[0]
                )
            );
        }

        return newEntityAndSpawn;
    },
});

/**
 * Creates a copy of the DEFAULT_ENTITY object, applies caller-specified property overrides, and returns the copy.
 * @param {*} customFieldValues Custom values object which will pass all of its properties and values to the returned result.
 * @returns {Entity}
 */
export const createEntity = (customFieldValues = {}) => {
    const newEntity = Object.assign(
        {},
        DEFAULT_ENTITY, // Entity default "0" values
        {
            // get reference to spriteSheet <img> element (if not overridden in `customFieldValues`)
            spriteSheet: document.getElementById(
                customFieldValues.spriteSheetId ?? DEFAULT_ENTITY.spriteSheetId
            ),
            id: generateUUID(), // Every entity gets a unique identifier
        },
        // Allow each entity to be created with any of its field values overwritten, and new ones added
        customFieldValues
    );

    Object.keys(newEntity.states ?? {}).forEach((stateKey) => {
        if (newEntity.states[stateKey].updateState) {
            newEntity.states[stateKey].updateState =
                newEntity.states[stateKey].updateState.bind(newEntity);
        }
    });

    return immutableCopy(newEntity);
};

/**
 * Copies the values of all entity fields that would be required to re-create
 * this same entity using the `createEntity()` function. This is a kind of
 * compression step used mostly when creating a save file.
 * @param {*} entity Entity object to copy required fields from
 * @param {*} otherFieldsToSave Additional field to persist aside from core
 * @returns {} JSON-friendly object with only necessary entity values
 */
export const getEntityCoreValues = (entity, otherFieldsToSave = []) => {
    const entitySaveableFields = Array.from(ENTITY_CORE_FIELDS).concat(
        otherFieldsToSave?.length === 0 ||
            otherFieldsToSave.some((val) => typeof val !== "string")
            ? []
            : otherFieldsToSave
    );

    const returnVal = entitySaveableFields.reduce(
        (entityCoreValues, fieldNameToSave) => ({
            ...entityCoreValues,
            [fieldNameToSave]: entity[fieldNameToSave] ?? undefined,
        }),
        {}
    );

    return Object.freeze(returnVal);
};

// TODO: Move these constants to somewhere they make more sense
const KNOCKBACK_MIN_STRENGTH = 0.05;
const KNOCKBACK_MULTIPLIER = 0.3;
const KNOCKBACK_DECAY_MULTIPLIER = 0.95;

export const defaultRecoilStateUpdate = ({ currentEntityState, scene }) => {
    const nextEntityState = Object.assign({}, currentEntityState);

    const knockbackStrength =
        currentEntityState.knockbackVector.getMagnitude() *
        KNOCKBACK_MULTIPLIER;

    // When knockback has subsided, return to "idle" state
    if (
        !currentEntityState.knockbackVector ||
        knockbackStrength < KNOCKBACK_MIN_STRENGTH
    ) {
        nextEntityState.currentState = "idle";
        nextEntityState.frameCount = 0;
        nextEntityState.animationTimer = 0;
        return nextEntityState;
    }

    // If entity is still being knocked back,
    // move based on knockback strength.
    const velocityXY =
        currentEntityState.knockbackVector.getMagnitudeComponents(); // { x: Number, y: Number }

    // Reduce knockback strength
    nextEntityState.knockbackVector =
        currentEntityState.knockbackVector.createParallelVector(
            undefined,
            currentEntityState.knockbackVector.getMagnitude() *
                KNOCKBACK_DECAY_MULTIPLIER
        );

    // Ensure walls are respected
    Object.assign(
        velocityXY,
        currentEntityState.checkWallCollision({
            scene,
            velocityVector: velocityXY,
        })
    );

    // Apply distance to entity
    nextEntityState.x += velocityXY.x;
    nextEntityState.y += velocityXY.y;

    return nextEntityState;
};
