import unitSprites from "../../spriteDefinitions/units.js";
import { createEntity, getHitboxBounds, teams } from "../entity.js";
import { getVector, immutableCopy } from "../../utils/helper.js";
import { ANIMATION_SLIDES_PER_FRAME } from "../../utils/constants.js";
import { emitHit } from "../../events/onHit.js";
import { statusEffects } from "../../events/statusEffect.js";

// If enemy is hit, return entity ID
export const detectProjectileHitEntity = (projectile, validTargets) => {
    const hitboxOffsetVector = getVector(
        { x: projectile.x, y: projectile.y },
        {
            x: projectile.x + projectile.collisionCenterOffset?.x ?? 0,
            y: projectile.y + projectile.collisionCenterOffset?.y ?? 0,
        }
    ).rotate({ degrees: projectile.rotation });

    // Detect if the point of the projectile is inside an enemy entity's hitbox
    //TODO: define more complex hitboxes and collision rules for them, such as line, vector, oval, pill, rectangle
    const hitboxCoordinate = hitboxOffsetVector.getEndPosition();

    const impactedEnemy = validTargets.find((enemy) => {
        const { x1, x2, y1, y2 } = getHitboxBounds(enemy);
        return (
            x1 < hitboxCoordinate.x &&
            x2 > hitboxCoordinate.x &&
            y1 < hitboxCoordinate.y &&
            y2 > hitboxCoordinate.y
        );
    });

    return impactedEnemy ?? false;
};

const DEFAULT_PROJECTILE = {
    type: "genericProjectile",
    classification: "projectile",
    x: 0,
    y: 0,
    z: 0,
    originCoordinate: { x: 0, y: 0 },
    targetCoordinate: { x: 0, y: 0 },
    rotation: 0,
    startMomentum: 0,
    currentMomentum: 0,
    maxAirTime: 20000, // Maximum number of milliseconds any projectile should be in inFlight state for. Prevents things from flying forever
    isEternal: false, // Projectiles with this property defined will never be forcefully despawned by the default projectile update handler
    trajectoryVector: getVector(), // See below for assigning a real vector to a projectile
    currentState: "inFlight",
    frameCount: 0,
    animationTimer: 0,
    reverseImage: false, // Tells spriteRender to flip the sprite horizontally (shouldn't be needed for projectiles)
    team: teams[0],
    baseHeight: 16,
    baseWidth: 16,
    baseRotation: 0, // Angle of rotation needed for sprite to point directly left on the screen. (positive degrees rotate the sprite clockwise)
    collisionCenterOffset: { x: 0, y: 0, w: null, h: null }, // Hitbox of prejectile to determine when an enemy had been struck
    states: {
        inFlight: {
            animationFrames: [unitSprites.frames["gobarrow.tif"]],
            updateState: ({ currentEntityState, entities }) => {
                const impactedEnemy = detectProjectileHitEntity(
                    currentEntityState,
                    Array.from(entities).filter(
                        (ent) =>
                            ent.classification !== "projectile" &&
                            ent.team !== projectile.team &&
                            ent.id !== projectile.id
                    )
                );
                // If an enemy is hit, an impact will occur. The default side effect of a hit event is to
                // deal damage and despawn the projectile
                if (Boolean(impactedEnemy)) {
                    currentEntityState.onHit({
                        currentEntityState,
                        targetEntity: impactedEnemy,
                    });
                }

                const nextEntityState = Object.assign({}, currentEntityState);

                const [newCoordinates, newRotation, newMomentum] =
                    currentEntityState.getNextPosition({
                        currentEntityState,
                    });
                Object.assign(nextEntityState, newCoordinates, {
                    rotation: newRotation,
                });

                // End of flight, biff into the ground
                if (newMomentum <= 0) {
                    Object.assign(
                        nextEntityState,
                        {
                            frameCount: 0,
                            z: -1,
                            currentState: "terminal",
                        },
                        currentEntityState.targetCoordinate
                    );
                }
                return immutableCopy(nextEntityState);
            },
        },
        terminal: {
            animationFrames: [unitSprites.frames["gobarrowingrass.tif"]],
            onFinish: ({ currentEntityState }) => {
                const nextEntityState = Object.assign({}, currentEntityState, {
                    shouldDespawn: true,
                });
                return nextEntityState;
            },
        },
    },
    /**
     * Using speed, current distance, source, and target,
     * calculate what the next position, rotation, and remaining momentum should be.
     * @returns {tuple} tuple [Coordinate2D, rotationAngleDeg, momentum]
     */
    getNextPosition: ({ currentEntityState }) => {
        const nextDistance =
            currentEntityState.getDistanceFromStartingPoint({
                currentEntityState,
            }) + currentEntityState.speed;
        const nextMomentum = currentEntityState.startMomentum - nextDistance;
        return [
            currentEntityState.trajectoryVector.getEndPosition(nextDistance),
            currentEntityState.rotation,
            nextMomentum,
        ];
    },
    getDistanceFromStartingPoint: ({ currentEntityState }) => {
        const { x, y, originCoordinate } = currentEntityState;
        return Math.sqrt(
            Math.pow(x - originCoordinate.x, 2) +
                Math.pow(y - originCoordinate.y, 2)
        );
    },
    update: ({ currentEntityState, ...params }) => {
        const currentStateObject =
            currentEntityState.states[currentEntityState.currentState] ??
            currentEntityState.states["terminal"];
        let updateStateReturnValue = Object.assign(
            {},
            currentStateObject?.updateState?.({
                currentEntityState,
                ...params,
            }) ?? currentEntityState
        );

        let nextFrameCount = updateStateReturnValue.frameCount;
        let nextAnimationTimer;

        // Keep track of how many state update iterations this currentState has lasted for
        nextAnimationTimer = //TODO: rewrite this to be a tick counter.
            currentEntityState.currentState ===
            updateStateReturnValue.currentState
                ? currentEntityState.animationTimer + 1
                : 0;

        // Update currently displayed animationFrame
        if (currentStateObject.animationFrames?.length > 1) {
            nextFrameCount =
                currentEntityState.currentState ===
                updateStateReturnValue.currentState
                    ? currentEntityState.frameCount + ANIMATION_SLIDES_PER_FRAME
                    : updateStateReturnValue.frameCount; // 0.2 means each sprite lasts for 5 frames
        }

        if (nextFrameCount > currentStateObject.animationFrames.length) {
            nextFrameCount = 0;
            updateStateReturnValue =
                currentStateObject.onFinish?.({
                    currentEntityState: immutableCopy(updateStateReturnValue),
                }) ?? updateStateReturnValue;
        }

        // Ensure (nearly) all projectiles despawn eventually
        if (
            !currentEntityState.isEternal &&
            currentEntityState.animationTimer * (1000 / 60) >
                currentEntityState.maxAirTime
        ) {
            Object.assign(
                updateStateReturnValue,
                {
                    frameCount: 0,
                    z: -1,
                    currentState: "terminal",
                },
                currentEntityState.targetCoordinate
            );
        }
        return Object.assign({}, immutableCopy(updateStateReturnValue), {
            frameCount: nextFrameCount,
            animationTimer: nextAnimationTimer,
        });
    },
    hitEffects: ["damage"],
    //TODO: standardize this; make it extensible
    onHit: ({ currentEntityState, targetEntity, sideEffects = null }) => {
        emitHit({
            sourceEntity: currentEntityState,
            targetEntity: targetEntity,
            sideEffects: sideEffects ?? [
                {
                    //TODO: "damage" should be a very common effect
                    //TODO: "flash" will likely be applied on all damage occurrences, but may need to also exist separately
                    //TODO    - Flash means the colors for that entity's sprite should all become white, then fade back to normal
                    effect: "damage",
                    duration: 0,
                    apply: ({ targetEntity }) => ({
                        targetEntity: Object.assign({}, targetEntity, {
                            currentHP:
                                targetEntity.currentHP -
                                    currentEntityState.damage <
                                0
                                    ? 0
                                    : targetEntity.currentHP -
                                      currentEntityState.damage,
                        }),
                    }),
                },
                {
                    effect: "removeSelf",
                    duration: 0,
                    apply: ({ sourceEntity }) => {
                        return {
                            sourceEntity: Object.assign({}, sourceEntity, {
                                shouldDespawn: true,
                            }),
                        };
                    },
                },
            ],
        });
        return true;
    },
};

export const createProjectile = (
    projectileInitialValues = {
        x: 0,
        y: 0,
        originCoordinate: { x: 0, y: 0 },
        targetCoordinate: { x: 0, y: 0 },
        team: "blue",
        // And any overrides
    }
) => {
    const trajectoryVector = getVector(
        {
            x: projectileInitialValues.originCoordinate.x,
            y: projectileInitialValues.originCoordinate.y,
        },
        {
            x: projectileInitialValues.targetCoordinate.x,
            y: projectileInitialValues.targetCoordinate.y,
        }
    );

    return createEntity(
        Object.assign(
            {},
            DEFAULT_PROJECTILE,
            {
                trajectoryVector,
                originCoordinate: {
                    x: projectileInitialValues.x ?? 0,
                    y: projectileInitialValues.y ?? 0,
                },
                startMomentum: trajectoryVector.getMagnitude(),
                currentMomentum: trajectoryVector.getMagnitude(),
                rotation:
                    trajectoryVector.getAngleDeg() +
                    (projectileInitialValues.baseRotation ?? 0),
            },
            projectileInitialValues,
            {
                // Ensure all projectiles have the default states defined (currently "inFlight" and "terminal")
                states: Object.assign(
                    {},
                    DEFAULT_PROJECTILE.states,
                    projectileInitialValues.states
                ),
            }
        )
    );
};
