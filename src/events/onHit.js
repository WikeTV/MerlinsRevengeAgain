import { emitCustomGameEvent } from "./useCustomEvent.js";

export const PROJECTILE_HIT_EVENT_NAME = "projectileOnHit";

export const emitHit = ({
    projectileEntity,
    targetEntity,
    sideEffects,
    ...other
}) => {
    return emitCustomGameEvent({
        name: PROJECTILE_HIT_EVENT_NAME,
        projectileEntity,
        targetEntity,
        sideEffects,
        ...other,
    });
};
