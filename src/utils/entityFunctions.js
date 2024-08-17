export const getEntityBaseCenterCoordinates = (entity) => {
    return {
        x: entity.x + entity.baseWidth / 2,
        y: entity.y + entity.baseHeight / 2,
    };
};

export const findNearestFoe = (me, entities) => {
    const { x, y, team } = me;
    let enemyEntities = entities.filter((ent) => ent.team !== team);
    let nearestFoe = enemyEntities.reduce((ent) => {
        return ent;
    }, enemyEntities[0]);

    return nearestFoe;
};

export const getSpeedXYComponents = (currentXY, targetXY, speed) => {
    // If no target coord, then entity should not move
    if (!targetXY) {
        return { x: 0, y: 0 };
    }
    const totalDelta = {
        x: targetXY.x - currentXY.x,
        y: targetXY.y - currentXY.y,
    };
    const angleRadians = Math.atan2(totalDelta.y, totalDelta.x);
    const incrementSpeed = { x: 0, y: 0 };
    incrementSpeed.x = Math.cos(angleRadians) * speed;
    incrementSpeed.y = Math.sin(angleRadians) * speed;
    return incrementSpeed;
};
