import { createProjectile } from "../enitites/projectiles/projectile.js";
import { emitCustomGameEvent } from "./useCustomEvent.js";

export const MAGIC_THROW_EVENT_NAME = "onMagicThrown";

// targetEntity is the magic ball that is being thrown
export const emitMagicThrow = ({
    targetEntity,
    sourceEntity,
    targetCoordinate,
}) => {
    return emitCustomGameEvent({
        name: MAGIC_THROW_EVENT_NAME,
        targetEntity,
        sideEffects: [
            {
                // When magic is "casted" (aka "thrown"), give the magic ball an origin point and a destination
                // targetEntity is the magic
                // sourceEntity is the caster (Player, Ghost, DarkWizard, etc.)
                apply({ targetEntity, allEntities }) {
                    // Remove placeholder projectile-specific values from when magic was charging
                    const {
                        startMomentum,
                        targetCoordinate: oldTarget,
                        originCoordinate,
                        currentMomentum,
                        trajectoryVector,
                        ...targetEntityPassthroughProps
                    } = targetEntity;

                    // Give magic a projectile path
                    const magicProjectile = createProjectile({
                        ...targetEntityPassthroughProps,
                        originCoordinate: {
                            x: targetEntity.x,
                            y: targetEntity.y,
                        },
                        targetCoordinate: {
                            x: targetCoordinate.x,
                            y: targetCoordinate.y,
                        },
                        currentState: "inFlight",
                    });

                    // Remove magic object reference from parent entity
                    const newSourceEntityState = Object.assign(
                        {},
                        allEntities.find((ent) => ent.id === sourceEntity.id),
                        {
                            magicEntityId: null,
                        }
                    );
                    return {
                        targetEntity: magicProjectile,
                        sourceEntity: newSourceEntityState,
                    };
                },
            },
        ],
    });
};
