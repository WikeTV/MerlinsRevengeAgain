import { createNpc, useNpcAI } from "./createNpc.js";
import { unitTileMap } from "../../spriteDefinitions/units.js";
import { defaultRecoilStateUpdate } from "../entity.js";
import {
    createProjectile,
    detectProjectileHitEntity,
} from "../projectiles/projectile.js";
import { immutableCopy } from "../../utils/helper.js";
import { emitEntitySpawn } from "../../events/onEntitySpawn.js";

const createBoulderMonsterProjectile = ({
    x,
    y,
    team,
    targetCoordinate,
} = {}) => {
    const boulderMonsterProjectileInitialValues = {
        type: "projectile_boulderMonsterRock",
        team: team,
        x: x,
        y: y,
        z: 100,
        maxAirTime: 5000,
        baseRotation: 0,
        originCoordinate: { x, y },
        targetCoordinate: { x: targetCoordinate.x, y: targetCoordinate.y },
        speed: 3,
        damage: 34,
        collisionCenterOffset: { x: -8, y: 0 },
        states: {
            inFlight: {
                animationFrames: [{ ...unitTileMap.frames["boulder.tif"] }],
                updateState: ({ currentEntityState, entities }) => {
                    const impactedEnemy = detectProjectileHitEntity(
                        currentEntityState,
                        Array.from(entities).filter(
                            (ent) =>
                                ent.classification !== "projectile" &&
                                ent.team !== currentEntityState.team &&
                                ent.id !== currentEntityState.id
                        ) // Only check for hits on valid targets
                    );
                    // If an enemy is hit, an impact will occur. The default side effect of a hit event is to
                    // deal damage and despawn the projectile
                    if (Boolean(impactedEnemy)) {
                        currentEntityState.onHit({
                            currentEntityState,
                            targetEntity: impactedEnemy,
                        });
                    }

                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );

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
                                rotation: 0,
                            },
                            currentEntityState.targetCoordinate
                        );
                    }
                    return immutableCopy(nextEntityState);
                },
            },
            terminal: {
                // Don't stay in the ground forever. Maybe 10 frames (1 sec)?
                animationFrames: Array.from(new Array(5)).map(
                    () => unitTileMap.frames["boulder_in_grass.tif"]
                ),
                onFinish: ({ currentEntityState }) => {
                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState,
                        { shouldDespawn: true }
                    );
                    return nextEntityState;
                },
            },
        },
    };

    return createProjectile(boulderMonsterProjectileInitialValues);
};

// Recoil state updater with less knockback, since BoulderMonster is a big boy
const boulderMonsterRecoilStateUpdate = ({ currentEntityState, scene }) => {
    return defaultRecoilStateUpdate({
        currentEntityState,
        scene,
        knockbackMultiplier: 0.1,
    });
};

const ENTITY_TYPE = "BoulderMonster";

export const BoulderMonster = (initialValues) => {
    const updateBoulderMonsterState = useNpcAI(ENTITY_TYPE);
    const boulderMonsterInitialState = createNpc({
        team: "green",
        type: ENTITY_TYPE,
        baseWidth: 45,
        baseHeight: 45,
        attackRange: 300,
        currentHP: 1000,
        spriteSheet: document.getElementById("character-sprites"),
        states: {
            idle: {
                isReversed: true,
                animationFrames: [{ ...unitTileMap.frames["bm2.tif"] }],
                updateState: updateBoulderMonsterState,
            },
            recoil: {
                isReversed: true,
                animationFrames: [{ ...unitTileMap.frames["bm2.tif"] }],
                updateState: boulderMonsterRecoilStateUpdate,
            },
            walking: {
                animationFrames: Array.from(unitTileMap.animations["B2wa"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
                updateState: updateBoulderMonsterState,
            },
            attacking: {
                animationFrames: Array.from(unitTileMap.animations["Bmfi"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
                executeOnFrame: 90, // Animation sprite 20, but all sprites are held for 5 frames
                onFrameReached: ({ currentEntityState }) => {
                    console.log("huuuuh");
                    // When Boulder Monster finishes the "attacking" animation, it should fire an arrow at its target

                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    const newRockProjectile = createBoulderMonsterProjectile({
                        x: nextEntityState.x,
                        y: nextEntityState.y,
                        team: nextEntityState.team,
                        targetCoordinate: nextEntityState.targetCoordinate,
                    });

                    // Use eventManager bus to spawn in the newly created arrow projectile
                    emitEntitySpawn({
                        targetEntity: newRockProjectile,
                        sourceEntity: nextEntityState,
                    });
                    return nextEntityState;
                },
                // Kinda do nothing on finish, since the projectile launch is handled halfway through the animation
                onFinish: ({ currentEntityState }) => {
                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    // After attacking, allow AI to check if player is still in range
                    nextEntityState.currentState = "walking";
                    nextEntityState.frameCount = 0;
                    nextEntityState.animationTimer = 0;

                    return nextEntityState;
                },
                updateState: updateBoulderMonsterState,
            },
            dead: {
                animationFrames: [
                    { ...unitTileMap.frames["boulder_grave.tif"] },
                ],
            },
        },
        currentState: "idle",
        ...(initialValues || initialValues),
    });
    return boulderMonsterInitialState;
};

export default BoulderMonster;
