import { convertToArray, immutableCopy } from "../utils/helper.js";
import { createEntityOfType } from "./entityFactory.js";
import { getEntityCoreValues } from "./entity.js";
import { IS_DEBUG } from "../utils/constants.js";

// Add an entity object to the list of entities in the entityManager state
const appendEntityInManager = ({
    entityManagerState,
    entity,
    attributeOverrides = {}, // currently unused, but could allow for global alterations to the spawning of entities
}) => {
    const newEntityManagerState = Object.assign({}, entityManagerState);
    newEntityManagerState.entities = [
        ...Array.from(entityManagerState.entities),
        entity,
    ];

    newEntityManagerState.entities.sort((a, b) => (a.z > b.z ? 1 : -1)); // Make certain entities have draw priority

    // Replace entities array with array that has new entity in it
    return newEntityManagerState;
};

// Use create an entity and add it to the entityManager state
const createAndSpawnEntity = ({ entityValues = {}, entityManagerState }) => {
    let entity = createEntityOfType(entityValues.type, entityValues);
    return appendEntityInManager({ entity, entityManagerState });
};

// When an enitity is marked for despawn, it will end its life cycle via this function
// Optionally, the caller can specify the filter function
// (true evaluation of condition will result in entity despawning)
const despawnEntities = (
    { entityManagerState },
    condition = (ent) => ent.shouldDespawn
) => {
    return {
        ...entityManagerState,
        entities: Array.from(entityManagerState.entities || []).filter(
            (ent, i) => !condition(ent, i)
        ),
    };
};

const updateEntities = ({
    entityManagerState,
    playerInput,
    scalingMultiplier,
    ...props
}) => {
    const newEntitiesMap = Array.from(entityManagerState.entities)
        .map((entity, i) => {
            return entity.update({
                currentEntityState: entity,
                container: entityManagerState.canvas,
                entities: entityManagerState.entities,
                scene: entityManagerState.scene,
                playerInput,
                scalingMultiplier,
                ...props,
            });
        })
        .reduce(
            // For entities spawning entities, an array will be returned from the update call
            (entities, entityUpdateReturnValue) => {
                const map = Object.assign({}, entities);
                let returnedEntityArray = convertToArray(
                    entityUpdateReturnValue
                );
                returnedEntityArray.forEach((entityUpdateValue) => {
                    map[entityUpdateValue.id] = entityUpdateValue;
                });
                return map;
            },
            {}
        );

    const newEntitiesArray = Object.values(newEntitiesMap);
    newEntitiesArray.sort((a, b) => (a.z > b.z ? 1 : -1)); // Make certain entities have draw priority

    return Object.assign({}, entityManagerState, {
        entities: newEntitiesArray.filter(
            (entity) => !entity.shouldDespawn && !entity.isDead
        ),
        entityGraves: newEntitiesArray.filter(
            (entity) => !entity.shouldDespawn && !entity.isDead
        ),
    });
};

const spawnSceneEntities = ({ entityManagerState }) => {
    const newEntityManagerState = entityManagerState.scene?.entities?.reduce(
        (newState, currentEntity) =>
            createAndSpawnEntity({
                entityValues: currentEntity,
                entityManagerState: newState,
            }),
        Object.assign({}, entityManagerState)
    );

    if (IS_DEBUG) {
        console.log("debug spawnSceneEntities", {
            in: entityManagerState,
            out: immutableCopy(newEntityManagerState),
        });
    }
    return immutableCopy(newEntityManagerState);
};

const clearScreen = ({ entityManagerState }) => {
    // Clear previous frame
    entityManagerState.ctx.clearRect(
        0,
        0,
        entityManagerState.canvas.width,
        entityManagerState.canvas.height
    );
    return immutableCopy(entityManagerState);
};

const drawEntities = ({
    entityManagerState,
    entities = null,
    ctx = null,
    ...options
} = {}) => {
    Array.from(entities ?? entityManagerState.entities).forEach((entity) => {
        entity?.draw?.({
            context: ctx ?? entityManagerState.ctx,
            ...options,
        });
    });
    return immutableCopy(entityManagerState);
};

const getCurrentState = ({ entityManagerState }) => {
    return immutableCopy(entityManagerState);
};

export const getEntitiesForSaving = ({
    entityManagerState,
    otherFieldsToSave = [],
}) => {
    return Array.from(entityManagerState.entities).map((entity) =>
        getEntityCoreValues(entity, otherFieldsToSave)
    );
};

const removeEntity = ({ entityManagerState, entityToRemove }) => {
    let newEntities = entityManagerState.entities.filter(
        (ent) => ent.id !== entityToRemove.id
    );
    return immutableCopy({ ...entityManagerState, entities: newEntities });
};

export const getEntityManager = ({ entityCanvas, scene }) => {
    const entityManagerState = {
        entities: [],
        entityGraves: [],
        canvas: entityCanvas,
        ctx: entityCanvas.getContext("2d"),
        scene: scene,
        createEntityOfType: createEntityOfType,
        spawnEntity: null,
        iteration: 0,
        createAndSpawnEntity(entityValues) {
            return createAndSpawnEntity(entityValues, this);
        },
        spawnSceneEntities(params = {}) {
            return spawnSceneEntities({ entityManagerState: this, ...params });
        },
        updateEntities(params = {}) {
            return updateEntities({ entityManagerState: this, ...params });
        },
        despawnEntities(condition) {
            return despawnEntities({ entityManagerState: this }, condition);
        },
        processEvents(allCurrentEvents, { onSuccess }) {
            // An event has a target entity and a source entity
            // Either of these can be overridden by the event's side effect
            let entities = allCurrentEvents.reduce(
                (entityArrayState, event) => {
                    let nextEntityArrayState = Array.from(entityArrayState);
                    if (event.sideEffects) {
                        nextEntityArrayState = event.sideEffects.reduce(
                            (sideEffectEntities, effect) => {
                                const {
                                    targetEntity,
                                    sourceEntity,
                                    finishEffect = true,
                                } = effect.apply({
                                    targetEntity:
                                        sideEffectEntities.find(
                                            (ent) =>
                                                ent.id ===
                                                event.targetEntity?.id
                                        ) ?? event.targetEntity,
                                    sourceEntity:
                                        sideEffectEntities.find(
                                            (ent) =>
                                                ent.id ===
                                                event.sourceEntity?.id
                                        ) ?? event.sourceEntity,
                                    allEntities: sideEffectEntities,
                                });
                                if (targetEntity) {
                                    sideEffectEntities = [
                                        ...sideEffectEntities.filter(
                                            (ent) => ent.id !== targetEntity.id
                                        ),
                                        targetEntity,
                                    ];
                                }
                                if (sourceEntity) {
                                    sideEffectEntities = [
                                        ...sideEffectEntities.filter(
                                            (ent) => ent.id !== sourceEntity.id
                                        ),
                                        sourceEntity,
                                    ];
                                }
                                return sideEffectEntities;
                            },
                            entityArrayState
                        );
                    }
                    onSuccess(event);
                    return nextEntityArrayState;
                },
                Array.from(this.entities)
            );
            return immutableCopy(Object.assign(this, { entities }));
        },
        clearScreen(params = {}) {
            return clearScreen({ entityManagerState: this, ...params });
        },
        drawEntities(params = {}) {
            return drawEntities({ entityManagerState: this, ...params });
        },
        getCurrentState(params = {}) {
            return getCurrentState({ entityManagerState: this, ...params });
        },
        getEntitiesForSaving(params = {}) {
            return getEntitiesForSaving({
                entityManagerState: this,
                ...params,
            });
        },
        removeEntity(params = {}) {
            return removeEntity({ entityManagerState: this, ...params });
        },
    };

    return immutableCopy(entityManagerState);
};
