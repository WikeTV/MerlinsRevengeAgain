export const drawEntities = (
    context,
    entities,
    { scalingMultiplier, isShowHitbox }
) => {
    // const viewWidth = context.canvas.width
    // const viewHeight = context.canvas.height

    entities.forEach((entity) => {
        const activeAnimationState =
            entity.state.animationStates[entity.state.currentAnimationState];
        if (!entity.state.frameCount) {
            entity.state.frameCount = 0;
        }
        const currentFrame =
            activeAnimationState.animationFrames[Math.floor(entity.frameCount)];
        const { x: sx, y: sy, w: sw, h: sh } = currentFrame.frame;
        let spriteWidth = (entity.state?.baseWidth ?? sw) * scalingMultiplier;
        let spriteHeight = (entity.state.baseHeight ?? sh) * scalingMultiplier;

        // Hitbox visualization
        if (isShowHitbox) {
            context.strokeStyle = "red";
            context.strokeRect(
                entity.state.x * scalingMultiplier - spriteWidth / 2,
                entity.state.y * scalingMultiplier - spriteHeight / 2,
                spriteWidth,
                spriteHeight
            );
            context.strokeStyle = "black";
        }

        // image element, spriteLocationX, spriteLocationY, spriteWidth, spriteHeight, canvasPositionX, canvasPositionY, drawWidth, drawHeight

        context.save();
        context.translate(
            entity.state.x * scalingMultiplier,
            entity.state.y * scalingMultiplier
        );
        context.rotate(((entity.state.rotation ?? 0) * Math.PI) / 180);
        if (entity.state.reverseImage) {
            context.scale(-1, 1);
        }
        context.drawImage(
            entity.state.spriteSheet,
            sx,
            sy,
            sw,
            sh,
            ((entity.state.reverseImage ? 1 : -1) * spriteWidth) / 2,
            (-1 * spriteHeight) / 2,
            entity.state.reverseImage ? -1 * spriteWidth : spriteWidth,
            spriteHeight
        );
        console.log(entity.state.frameCount);
        if (
            Math.floor(entity.state.frameCount) <
            activeAnimationState.animationFrames.length - 1
        ) {
            entity.state.frameCount +=
                activeAnimationState.animationSpeed ?? 0.2; // Default animation speed will be 5 frames per image
        } else {
            entity.state.frameCount = 0;
            console.log(activeAnimationState?.noLoop);
            if (activeAnimationState?.noLoop) {
                entity.state.animationTimer = 0;
                entity.state.activeAnimationState = "idle";
            }
        }

        context.restore();
    });
};

export const fillCircle = (context, circle) => {
    const circleDrawPath = new Path2D();
    circleDrawPath.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    context.fill(circleDrawPath);
};
