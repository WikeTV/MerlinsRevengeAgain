/**
 * Represents a 2-dimensional vector. Can be used for projectile targetting, pathing, etc.
 * This is built to be used on a web-based coordinate system
 * ( y-axis up goes towards negative infinity, x-axis left goes towards negative infinity )
 *    -
 *  - . +
 *    +
 */
export class Vector2D {
    /**
     * @param {coorinate2D} sourceCoordinate  - {x, y} of start grid location
     * @param {coorinate2D} targetCoordinate  - {x, y} of end grid location
     * @returns {Vector2D}
     */
    constructor(source = { x: 0, y: 0 }, target = { x: 0, y: 0 }) {
        this.source = Object.assign({}, source);
        this.target = Object.assign({}, target);
        this.magnitudeComponents = {
            x: target.x - source.x,
            y: target.y - source.y,
        };
        this.magnitude = Math.sqrt(
            Math.pow(this.magnitudeComponents.x, 2) +
                Math.pow(this.magnitudeComponents.y, 2)
        );
        this.angleRad =
            Math.atan2(this.magnitudeComponents.y, this.magnitudeComponents.x) +
            Math.PI;
        this.angleDeg = this.angleRad * (180 / Math.PI);
    }
    getEndPosition(mag) {
        const magnitude = mag ?? this.magnitude;
        const xComponent =
            this.source.x + magnitude * Math.cos(this.angleRad) * -1;
        const yComponent =
            this.source.y + magnitude * Math.sin(this.angleRad) * -1;
        return { x: xComponent, y: yComponent };
    }
    getMagnitude() {
        return this.magnitude;
    }
    getMagnitudeComponents() {
        return { x: this.magnitudeComponents.x, y: this.magnitudeComponents.y };
    }
    getAngleDeg() {
        return this.angleDeg;
    }
    getAngleRad() {
        return this.angleRad;
    }
    rotate({ radians, degrees }) {
        return radians
            ? Object.assign(this, {
                  angleRad: this.angleRad + radians,
                  angleDeg: (this.angleRad + radians) * (180 / Math.PI),
              })
            : degrees
            ? Object.assign(this, {
                  angleRad: (this.angleDeg + degrees) * (Math.PI / 180),
                  angleDeg: this.angleDeg + degrees,
              })
            : this;
    }
    createParallelVector(
        startCoordinate = Object.assign({}, this.source),
        magnitude = this.getMagnitude()
    ) {
        const magnitudeY = Math.sin(this.getAngleRad()) * magnitude * -1; // negative 1 is important... still not sure why
        const magnitudeX = Math.cos(this.getAngleRad()) * magnitude * -1;

        return new Vector2D(startCoordinate, {
            x: startCoordinate.x + magnitudeX,
            y: startCoordinate.y + magnitudeY,
        });
    }
}
