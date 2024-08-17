import { emitCustomGameEvent } from "./useCustomEvent.js";

export const ENTITY_SPAWN_EVENT_NAME = "onEntitySpawn";

export const emitEntitySpawn = ({ targetEntity }) => {
    return emitCustomGameEvent({
        name: ENTITY_SPAWN_EVENT_NAME,
        targetEntity,
        sideEffects: [
            {
                // When an entity is spawned, add it to the entityManager
                apply({ targetEntity }) {
                    return { targetEntity };
                },
            },
        ],
    });
};
