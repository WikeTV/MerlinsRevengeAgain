import {
    BASE_VIEW_HEIGHT,
    BASE_VIEW_WIDTH,
} from "./constants.js";
import { getEntityBaseCenterCoordinates } from "./entityFunctions.js";

export const calculateSceneScalingMultiplier = (element) => {
    const viewportWidth =
        element?.width ?? document.documentElement.clientWidth;
    const viewportHeight =
        element?.height ?? document.documentElement.clientHeight;
    const scalingMultiplierW = viewportWidth / BASE_VIEW_WIDTH;
    const scalingMultiplierH = viewportHeight / BASE_VIEW_HEIGHT;

    return viewportWidth < viewportHeight * 2
        ? scalingMultiplierW
        : scalingMultiplierH;
};

export const rescaleElement = (element, scalingMultiplier) => {
    const viewWidth =
        BASE_VIEW_WIDTH *
        (scalingMultiplier ?? calculateSceneScalingMultiplier());
    const viewHeight =
        BASE_VIEW_HEIGHT *
        (scalingMultiplier ?? calculateSceneScalingMultiplier());
    element.width = viewWidth;
    element.height = viewHeight;
    element.style.width = viewWidth;
    element.style.height = viewHeight;
    return element;
};

export const getScaledEntityBounds = (
    {
        x: entityX,
        y: entityY,
        baseWidth: entityWidth,
        baseHeight: entityHeight,
    },
    scalingMultiplier
) => {
    return {
        x: entityX * scalingMultiplier,
        y: entityY * scalingMultiplier,
        w: entityWidth * scalingMultiplier,
        h: entityHeight * scalingMultiplier,
    };
};

export const getEntityScaledCenterCoordinates = (entity, scalingMultiplier) => {
    const { x, y, w, h } = getScaledEntityBounds(entity, scalingMultiplier);
    return getEntityBaseCenterCoordinates({
        x,
        y,
        baseWidth: w,
        baseHeight: h,
    });
};

export const getTileColumnFromPlayfieldX = (x) =>
    Math.floor(x * (18 / BASE_VIEW_WIDTH));
export const getTileRowFromPlayfieldY = (y) =>
    Math.floor(y * (9 / BASE_VIEW_HEIGHT));
