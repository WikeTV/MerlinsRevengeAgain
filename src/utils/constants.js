export const IS_DEBUG = true; //!DEV: Used to toggle on some additional console logging and (eventually) dev menus

export const BASE_VIEW_HEIGHT = 320; // Number of vertical distance units in the playfield
export const BASE_VIEW_WIDTH = 640; // Number of hotizontal distance units in the playfield
export const GRID_MAX_X_INDEX = 17; // Index of far-right grid tile column
export const GRID_MAX_Y_INDEX = 8; // Index of bottom grid tile row
export const VIEW_BG_COLOR = 0x1099bb; // Hex value for CSS color rule on webpage background element
export const BASE_MOVE_SPEED = 1; // Units of distance moved per frame (usually for entities)

export const RENDER_SCALING = 2; // How many times bigger is width than height
export const TARGET_FRAMERATE = 60; // Frames per second
export const MILLISECONDS_PER_FRAME = (1 / TARGET_FRAMERATE) * 1000; // Milliseconds per frame. Used to delay in between loops
export const FRAMES_PER_ANIMATION_SLIDE = 5; // Number of displayed frames an animation will linger on the same sprite for, before moving to the next one.
// MR expects 5-frame sprite animations
export const ANIMATION_SLIDES_PER_FRAME = 1 / FRAMES_PER_ANIMATION_SLIDE; // Used to set the animationTimer of sprite animations
export const CANVAS_DIV_ID = "canvas-container"; // Container element for all game canvases (should see  all events that are bubbled from the canvases)

export const INITIAL_GAME_STATE = {
    screen: "main-menu",
    magic: [],
    units: [],
    projectiles: [],
};

export const ENTITY_CORE_FIELDS = [
    "x",
    "y",
    "z",
    "rotation",
    "currentState",
    "currentHP",
    "isDead",
    "team",
    "type",
    "name",
    "spriteSheetId",
];

export const CUTSCENE_ANIMATION_DEFAULTS = {
    baseDialogDuration: 50, // Dialog of 0 length would appear for this many frames
    timePerTextCharacter: 1.4, // Add this many frames to dialog duration per character of text
    timeBetweenDialogLines: 12, // Frame count to wait between speech text displays
    spawnOffScreenCoordinates: { x: -100, y: -100 },
};

export const CUTSCENE_STAGE_INITIAL_SETTINGS = {
    lightLevel: 0, // 0 - 1, multiplier that gets applied to the lighting of stage scenes and puppets
    backgroundColor: "rgb(255,255,255)", // RGB color value
    title: null,
    width: BASE_VIEW_WIDTH,
    height: BASE_VIEW_HEIGHT,
    isFinished: false,
};

export const CUTSCENE_ENTITIES = {
    "#merlin": "Player",
};
