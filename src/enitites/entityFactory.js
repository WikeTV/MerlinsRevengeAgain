import { createEntity } from "./entity.js";

import * as specialEntities from "./special/index.js";
import * as npcs from "./npcs/index.js";
import * as spawners from "./spawners/index.js";

export const entityTypes = {
    ...specialEntities,
    ...npcs,
    ...spawners,
};

// Create an entity object from a saved entity definition (factory)
export const createEntityOfType = (type, initialValues = {}) => {
    const defaultValues = {
        type: type,
        spriteSheet: document.getElementById("character-sprites"),
    };

    // Unknown Entity types will be initialized with some default values
    return createEntity({
        ...defaultValues,
        ...(type && Object.keys(entityTypes).includes(type)
            ? entityTypes[type](initialValues)
            : initialValues),
    });
};
