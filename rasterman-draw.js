'use strict';

exports.init = function (rasterImage) {
    
    /**
	 * Draws a line on a raster image using the Bresenham algorithm.
	 * @param {number} x0 The x coordinate of the starting point
	 * @param {number} y0 The y coordinate of the starting point
	 * @param {number} x1 The x coordinate of the ending point
	 * @param {number} y1 The y coordinate of the ending point
	 * @param {object} color An object representing the color of the line
	 * @returns The raster image itself (for chaining)
	 */
	rasterImage.prototype.drawLine = function (x0, y0, x1, y1, color) {
        
        color = rasterImage._colorify(color);
        
        var pixelFunc = rasterImage.prototype._setPixel.bind(this);
        if (color[3] < 255)
            pixelFunc = rasterImage.prototype.blendPixel.bind(this);
        
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;
        
        while (true) {
            
            pixelFunc(x0, y0, color);
            
            if ((x0 == x1) && (y0 == y1)) break;
            var e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
        
        return this;
    };
    
    rasterImage.prototype.drawRect = function (x, y, width, height, color) {
        color = rasterImage._colorify(color);
        
        var l = Math.max(0, x);
        var t = Math.max(0, y);
        
        var r = Math.min(this.width, l + width);
        var b = Math.min(this.height, t + height);
        
        var pixelFunc = rasterImage.prototype.__setPixel.bind(this);
        if (color[3] < 255)
            pixelFunc = rasterImage.prototype._blendPixel.bind(this);
        
        for (var y = t; y < b; y++) {
            for (var x = l; x < r; x++) {
                pixelFunc(x, y, color);
            }
        }
        
        return this;
    };
    
    /**
     * Draws a horizonal line (optimized for this special case), often used for filling shapes
     * @private
     */
    rasterImage.prototype._drawHorizonalLine = function (x1, x2, y, color) {
        
        if (x2 < x1)
            var tmp = x1, x1 = x2, x2 = tmp;    // swap x1 and x2
        
        if (color[3] < 255)
            pixelFunc = rasterImage.prototype._blendPixel.bind(this);
        else {
            var c32 = new Uint32Array(color.buffer);   // c32 now holds a 32bit color representation
            for (var i = y * this.width + x1; i < y * this.width + x2; i++) {
                this.data32[i] = c32[0];
            }
        }
    };
    
    rasterImage.prototype.drawEllipse = function (cx, cy, xRadius, yRadius, color, fill) {
        color = rasterImage._colorify(color);
        
        var pixelFunc = rasterImage.prototype._setPixel.bind(this);
        if (color[3] < 255)
            pixelFunc = rasterImage.prototype._blendPixel.bind(this);
        
        var X, Y, XChange, YChange, EllipseError, TwoASquare, TwoBSquare, StoppingX, StoppingY;
        
        var plot4EllipsePoints = function (X, Y) {
            if (fill) {
                this._drawHorizonalLine(cx - X, cx + X, cy + Y, color);
                this._drawHorizonalLine(cx - X, cx + X, cy - Y, color);

            } else {
                pixelFunc(cx + X, cy + Y, color);
                pixelFunc(cx + X, cy - Y, color);
                pixelFunc(cx - X, cy + Y, color);
                pixelFunc(cx - X, cy - Y, color);
            }
        }.bind(this);
        
        TwoASquare = 2 * xRadius * xRadius;
        TwoBSquare = 2 * yRadius * yRadius;
        X = xRadius;
        Y = 0;
        XChange = yRadius * yRadius * (1 - 2 * xRadius);
        YChange = xRadius * xRadius;
        
        EllipseError = 0;
        StoppingX = TwoBSquare * xRadius;
        StoppingY = 0;
        
        while (StoppingX >= StoppingY) {
            plot4EllipsePoints(X, Y);
            Y++;
            StoppingY += TwoASquare;
            EllipseError += YChange;
            YChange += TwoASquare;
            
            if ((2 * EllipseError + XChange) > 0) {
                X--;
                StoppingX -= TwoBSquare;
                EllipseError += XChange;
                XChange += TwoBSquare;
            }
        }
        
        X = 0;
        Y = yRadius;
        XChange = yRadius * yRadius;
        YChange = xRadius * xRadius * (1 - 2 * yRadius);
        EllipseError = 0;
        StoppingX = 0;
        StoppingY = TwoASquare * yRadius;
        while (StoppingX <= StoppingY) {
            plot4EllipsePoints(X, Y);
            X++;
            StoppingX += TwoBSquare;
            EllipseError += XChange;
            XChange += TwoBSquare;
            if ((2 * EllipseError + YChange) > 0) {
                Y--;
                StoppingY -= TwoASquare;
                EllipseError += YChange;
                YChange += TwoASquare;
            }
        }
        return this;
    };
};
