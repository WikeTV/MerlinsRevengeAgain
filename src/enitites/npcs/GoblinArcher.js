import { unitTileMap } from "../../spriteDefinitions/units.js";
import { createNpc, useNpcAI } from "./createNpc.js";
import {
    createProjectile,
    detectProjectileHitEntity,
} from "../projectiles/projectile.js";
import { immutableCopy } from "../../utils/helper.js";
import { emitEntitySpawn } from "../../events/onEntitySpawn.js";
import { defaultRecoilStateUpdate } from "../entity.js";

const createGoblinArrow = ({ x, y, team, targetCoordinate } = {}) => {
    const goblinArrowInitalValues = {
        type: "projectile_goblinArrow",
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
                animationFrames: [{ ...unitTileMap.frames["gobarrow.tif"] }],
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
                    () => unitTileMap.frames["gobarrowingrass.tif"]
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

    return createProjectile(goblinArrowInitalValues);
};

const ENTITY_TYPE = "goblinArcher";
const GoblinArcher = (initialValues) => {
    const goblinUpdateState = useNpcAI(ENTITY_TYPE);
    const goblinArcherObj = createNpc({
        type: ENTITY_TYPE,
        team: "green",
        baseWidth: 16,
        baseHeight: 16,
        targetCoordinate: undefined,
        attackRange: 150,
        speed: 1.5,
        currentHP: 200,
        states: {
            idle: {
                animationFrames: [
                    { ...unitTileMap.frames["goblin_load_arrow01.bmp"] },
                ],
                updateState: goblinUpdateState,
            },
            recoil: {
                animationFrames: Array.from(unitTileMap.animations["GARE"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
                updateState: defaultRecoilStateUpdate,
            },
            walking: {
                animationFrames: Array.from(unitTileMap.animations["Garu"]).map(
                    (frameName) => ({ ...unitTileMap.frames[frameName] })
                ),
                updateState: goblinUpdateState,
            },
            attacking: {
                animationFrames: Array.from(
                    unitTileMap.animations["goblin_load_arrow"]
                ).map((frameName) => ({ ...unitTileMap.frames[frameName] })),
                onFinish: ({ currentEntityState }) => {
                    // When goblinArcher finishes the "attacking" animation, it should fire an arrow at its target

                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    const newArrowProjectile = createGoblinArrow({
                        x: nextEntityState.x,
                        y: nextEntityState.y,
                        team: nextEntityState.team,
                        targetCoordinate: nextEntityState.targetCoordinate,
                    });

                    // Reset goblinArcher state to "idle" so that it can begin the search/attack cycle again
                    nextEntityState.currentState = "idle";
                    nextEntityState.frameCount = 0;
                    nextEntityState.animationTimer = 0;

                    // Use eventManager bus to spawn in the newly created arrow projectile
                    emitEntitySpawn({
                        targetEntity: newArrowProjectile,
                        sourceEntity: nextEntityState,
                    });
                    return nextEntityState;
                },
                updateState: goblinUpdateState,
            },
        },
        currentState: "idle",
        ...(initialValues || initialValues),
    });

    return goblinArcherObj;
};

export default GoblinArcher;
