/**
 * Status effects are event handlers which apply modifications to the affected entity.
 * They are keyed by name, and all share the same interface
 * ({ targetEntity: Entity, sourceEntity: Entity, allEntities?: Array<Entity> }) => { targetEntity?, sourceEntity?, finishEffect?: true }
 */
export const statusEffects = {
    damage: ({ targetEntity, sourceEntity }) => ({
        targetEntity: Object.assign({}, targetEntity, {
            currentHP:
                targetEntity.currentHP - sourceEntity.damage < 0
                    ? 0
                    : targetEntity.currentHP - sourceEntity.damage,
        }),
    }),
    removeSelf: ({ sourceEntity }) => {
        return {
            sourceEntity: Object.assign({}, sourceEntity, {
                shouldDespawn: true,
            }),
        };
    },
};
