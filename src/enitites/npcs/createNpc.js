import { getSpeedXYComponents } from "../../utils/entityFunctions.js";
import { immutableCopy } from "../../utils/helper.js";

export const useNpcAI = (key) => {
    return {
        goblinArcher({ currentEntityState, entities, scene }) {
            const newGoblinState = Object.assign({}, currentEntityState);
            let speedXY = { x: 0, y: 0 };
            let nextTargetCoordinate = currentEntityState.targetCoordinate;
            let nextAnimationTimerCount = currentEntityState.animationTimer + 1;
            let isFacingLeft = currentEntityState.reverseImage;

            const validTargets = entities.filter(
                (ent) =>
                    ent.classification !== "projectile" &&
                    ent.team !== currentEntityState.team &&
                    ent.id !== currentEntityState.id
            );

            const enemyTarget =
                validTargets.find((ent) =>
                    currentEntityState.targetedEntityId
                        ? currentEntityState.targetedEntityId === ent.id
                        : ent.team !== currentEntityState.team
                ) || null;

            const targetIsWithinAttackRange = enemyTarget
                ? Math.sqrt(
                      Math.pow(enemyTarget.x - currentEntityState.x, 2) +
                          Math.pow(enemyTarget.y - currentEntityState.y, 2)
                  ) <= currentEntityState.attackRange
                : false;

            if (!enemyTarget && currentEntityState.currentState !== "idle") {
                newGoblinState.currentState = "idle";
                newGoblinState.frameCount = 0;
            }

            if (currentEntityState.currentState === "recoil") {
                const knockbackVector = currentEntityState.knockbackVector;
                const knockbackForce = knockbackVector.getMagnitude() - knockbackVector.getMagnitude()
            }

            if (
                (currentEntityState.currentState === "idle" ||
                    currentEntityState.currentState === "walking") &&
                targetIsWithinAttackRange
            ) {
                nextTargetCoordinate = {
                    x: enemyTarget.x,
                    y: enemyTarget.y,
                };

                if (nextTargetCoordinate?.x < currentEntityState.x) {
                    isFacingLeft = true;
                } else {
                    isFacingLeft = false;
                }

                newGoblinState.currentState = "attacking";
                newGoblinState.frameCount = 0;
            } else if (currentEntityState.currentState === "idle") {
                if (validTargets?.length > 0) {
                    newGoblinState.currentState = "walking";
                    newGoblinState.frameCount = 0;
                }
            } else if (
                currentEntityState.currentState === "walking" &&
                enemyTarget
            ) {
                const trajectoryComponents = getSpeedXYComponents(
                    enemyTarget,
                    currentEntityState,
                    currentEntityState.attackRange
                );
                nextTargetCoordinate = {
                    x: enemyTarget.x + trajectoryComponents.x,
                    y: enemyTarget.y + trajectoryComponents.y,
                };

                speedXY = getSpeedXYComponents(
                    currentEntityState,
                    nextTargetCoordinate,
                    currentEntityState.speed
                );

                if (nextTargetCoordinate?.x < currentEntityState.x) {
                    isFacingLeft = true;
                } else {
                    isFacingLeft = false;
                }

                if (speedXY.x === 0 && speedXY.y === 0) {
                    nextTargetCoordinate = {
                        x: enemyTarget.x,
                        y: enemyTarget.y,
                    };
                    newGoblinState.currentState = "attacking";
                    newGoblinState.frameCount = 0;
                    nextAnimationTimerCount = 0;
                }
            } else if (
                currentEntityState.currentState === "attacking" &&
                enemyTarget
            ) {
                nextTargetCoordinate = {
                    x: enemyTarget.x,
                    y: enemyTarget.y,
                };
            }

            // Ensure entity cannot walk through terrain walls
            speedXY = currentEntityState.checkWallCollision({
                scene,
                velocityVector: speedXY,
            });

            Object.assign(newGoblinState, {
                x: currentEntityState.x + speedXY.x,
                y: currentEntityState.y + speedXY.y,
                targetedEntityId: enemyTarget?.id ?? null,
                targetCoordinate: nextTargetCoordinate,
                currentState: newGoblinState.currentState,
                animationTimer: nextAnimationTimerCount,
                reverseImage: isFacingLeft,
            });
            return Object.freeze(newGoblinState);
        },
    }[key];
};

export const createNpc = (entityProps = {}) => {
    const npcDefault = {
        targetCoordinate: undefined,
        attackRange: 5,
    };

    const newNpc = Object.assign({}, npcDefault, entityProps);

    return immutableCopy(newNpc);
};
