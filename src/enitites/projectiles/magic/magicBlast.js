import { emitHit } from "../../../events/onHit.js";
import { Vector2D } from "../../../utils/Vector2D.js";
import { checkPointIsInsideRectangle } from "../../../utils/hitboxes/checkPointIsInsideRectangle.js";
import { fillCircle } from "../../../utils/spriteRender.js";
import { createEntity } from "../../entity.js";
import { createProjectile, detectProjectileHitEntity } from "../projectile.js";

const FADE_DURATION = 40; // Number of update loops that the magic will take to fade out entirely after impact
const MAGIC_KNOCKBACK_MULTIPLIER = 1.5;

const detectMagicHitEntity = (magic, entity) => {
    const entityBounds = {
        top: entity.y - entity.baseHeight / 2,
        bottom: entity.y + entity.baseHeight / 2,
        left: entity.y - entity.baseHeight / 2,
        right: entity.y + entity.baseHeight / 2,
    };

    // Find angle and distance to entity center
    const magicCenterToEntityCenter = new Vector2D(
        {
            x: magic.x,
            y: magic.y,
        },
        { x: entity.x, y: entity.y }
    );

    const circleEdgePointClosestToEntity =
        magicCenterToEntityCenter.getEndPosition(magic.size);

    // If entity center is within blast radius, or blast radius edge is within entity bounds, then the entity is hit
    if (
        magicCenterToEntityCenter.getMagnitude() < magic.size ||
        checkPointIsInsideRectangle(
            circleEdgePointClosestToEntity,
            entityBounds
        )
    ) {
        return magic.size - magicCenterToEntityCenter.getMagnitude();
    } else {
        return 0;
    }
};

export const createMagicBlast = ({ ...initialValues } = {}) => {
    const magicObj = {
        type: "magicBlast",
        z: 2001,
        size: 1,
        speed: 6,
        maximumSize: 30,
        baseWidth: 1,
        baseHeight: 1,
        visualModifiers: {
            opacity: 1,
        },
        fadeOutTimer: FADE_DURATION,
        color: "yellow",
        currentState: "charging",
        spriteSheetId: "ui-sprites",
        draw({ context, scalingMultiplier }) {
            let scaledX = this.x * scalingMultiplier;
            let scaledY = this.y * scalingMultiplier;
            let radius = this.size * scalingMultiplier;

            context.save();

            // Apply visual modifiers
            context.globalAlpha = this.visualModifiers.opacity;
            context.fillStyle = "yellow";

            fillCircle(context, { x: scaledX, y: scaledY, radius: radius });

            context.restore();
        },
        states: {
            // While charging, increase size by 1 until `maximumSize` is reached
            charging: {
                animationFrames: [], // This is a required property, sadly. All other entities are dependent on sprites
                updateState: ({ currentEntityState, entities }) => {
                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );
                    if (
                        currentEntityState.size < currentEntityState.maximumSize
                    ) {
                        nextEntityState.size = currentEntityState.size + 1;
                    }
                    const parentEntity = entities.find(
                        (ent) => ent.id === currentEntityState.parentEntityId
                    );

                    // If somehow the parent loses its reference to this magic, then there would be no way to cast it
                    if (parentEntity.magicEntityId !== currentEntityState.id) {
                        nextEntityState.shouldDespawn = true;
                    }

                    nextEntityState.x = parentEntity.x;
                    nextEntityState.y =
                        parentEntity.y -
                        parentEntity.baseHeight / 2 -
                        nextEntityState.size;
                    return Object.freeze(nextEntityState);
                },
            },
            inFlight: {
                animationFrames: [],
                updateState: ({ currentEntityState, entities }) => {
                    const impactedEnemy = false;
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
                    Object.assign(nextEntityState, newCoordinates);

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
                    return Object.freeze(nextEntityState);
                },
            },
            terminal: {
                animationFrames: [],
                updateState: ({ currentEntityState, entities }) => {
                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );

                    // Expand radius as if there were an explosion on impact
                    // This has to happen here so that enemies will actually be hit
                    nextEntityState.size = nextEntityState.size + 20;

                    // Damage enemies

                    //TODO: detect hit enemies
                    const validTargets = [
                        ...entities.filter(
                            (ent) =>
                                ent.classification !== "projectile" &&
                                ent.team !== currentEntityState.team
                        ),
                    ];

                    // Get list of valid targets that have been hit, and calculate the
                    // proximity of the impact (distance to area of effect center)
                    const entitiesHit = validTargets
                        .map((ent) => [
                            ent,
                            detectMagicHitEntity(nextEntityState, ent),
                        ])
                        .filter(([ent, hitIntensity]) => hitIntensity > 0);

                    entitiesHit.forEach(([ent, hitIntensity]) => {
                        const magicCenterToEntityCenter = new Vector2D(
                            {
                                x: currentEntityState.x,
                                y: currentEntityState.y,
                            },
                            { x: ent.x, y: ent.y }
                        );
                        emitHit({
                            targetEntity: ent,
                            sourceEntity: currentEntityState,
                            sideEffects: [
                                {
                                    name: "damage",
                                    apply: ({ targetEntity, sourceEntity }) => {
                                        const newTargetEntityState =
                                            Object.assign({}, targetEntity);
                                        newTargetEntityState.currentHP -=
                                            hitIntensity;
                                        // An entitiy must have exactly 0 HP to be considered dead.
                                        // Immortal entities will always have negative HP, and will never cross the threshold of 0
                                        if(targetEntity.currentHP >= 0 && newTargetEntityState.currentHP <= 0) {
                                            newTargetEntityState.currentHP = 0
                                        }
                                        return {
                                            targetEntity: newTargetEntityState,
                                        };
                                    },
                                },
                                {
                                    name: "knockback",
                                    apply: ({ targetEntity, sourceEntity }) => {
                                        const newTargetEntityState =
                                            Object.assign({}, targetEntity);
                                        newTargetEntityState.currentState =
                                            targetEntity.states?.["recoil"]
                                                ? "recoil"
                                                : "idle";
                                        newTargetEntityState.frameCount = 0;
                                        newTargetEntityState.knockbackVector =
                                            magicCenterToEntityCenter.createParallelVector(
                                                {
                                                    x: targetEntity.x,
                                                    y: targetEntity.y,
                                                },
                                                hitIntensity *
                                                    MAGIC_KNOCKBACK_MULTIPLIER
                                            );
                                        return {
                                            targetEntity: newTargetEntityState,
                                        };
                                    },
                                },
                            ],
                        });
                    });

                    // Begin fade-out animation
                    nextEntityState.currentState = "fadeOut";
                    return Object.freeze(nextEntityState);
                },
            },
            fadeOut: {
                animationFrames: [],
                updateState: ({ currentEntityState }) => {
                    const nextEntityState = Object.assign(
                        {},
                        currentEntityState
                    );

                    // Rapidly increase transparency
                    nextEntityState.fadeOutTimer -= 1;
                    nextEntityState.visualModifiers.opacity -=
                        1 / FADE_DURATION;

                    // When magic is faded out, remove it
                    if (nextEntityState.fadeOutTimer <= 0) {
                        nextEntityState.shouldDespawn = true;
                    }
                    return Object.freeze(nextEntityState);
                },
            },
        },
        ...initialValues,
    };

    return createProjectile({
        ...magicObj,
        originCoordinate: { x: 0, y: 0 },
        targetCoordinate: { x: 0, y: 0 },
    });
};
