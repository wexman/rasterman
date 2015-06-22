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
	    
        color = this._colorify(color);
        
        var pixelFunc = rasterImage.prototype.setPixel.bind(this);
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
	}

	rasterImage.prototype.drawRect = function(x, y, width, height, color)
	{
	    color = this._colorify(color);
	    
	    var l = Math.max(0, x);
	    var t = Math.max(0, y);
	    
	    var r = Math.min(this.width, l + width);
	    var b = Math.min(this.height, t + height);
	    
	    var pixelFunc = rasterImage.prototype._setPixel.bind(this);
	    if (color[3] < 255)
	        pixelFunc = rasterImage.prototype._blendPixel.bind(this);
	    
	    for (var y = t; y < b; y++) {
	        for (var x = l; x < r; x++) {
	            pixelFunc(x, y, color);
	        }
	    }
	    
	    return this;
	}

	rasterImage.prototype.drawEllipse = function (xm, ym, a, b, color, fill) 
	{
        color = this._colorify(color);
        
        var pixelFunc = rasterImage.prototype.setPixel.bind(this);
        if (color[3] < 255)
            pixelFunc = rasterImage.prototype.blendPixel.bind(this);
	    
	    var dx = 0,
	        dy = b; /* im I. Quadranten von links oben nach rechts unten */
	    var a2 = a * a,
	        b2 = b * b;
	    var err = b2 - (2 * b - 1) * a2,
	        e2; /* Fehler im 1. Schritt */
	    
	    do {
	        
	        if (fill || false) {
	            this.drawLine(xm - dx, ym + dy, xm + dx, ym + dy, color);
	            this.drawLine(xm - dx, ym - dy, xm + dx, ym - dy, color);
	        } else {
	            pixelFunc(xm + dx, ym + dy, color); /* I. Quadrant */
	            pixelFunc(xm - dx, ym + dy, color); /* II. Quadrant */
	            pixelFunc(xm - dx, ym - dy, color); /* III. Quadrant */
	            pixelFunc(xm + dx, ym - dy, color); /* IV. Quadrant */
	        }
	        
	        e2 = 2 * err;
	        if (e2 < (2 * dx + 1) * b2) {
	            dx++;
	            err += (2 * dx + 1) * b2;
	        }
	        if (e2 > -(2 * dy - 1) * a2) {
	            dy--;
	            err -= (2 * dy - 1) * a2;
	        }
	    } while (dy >= 0);
	    
	    while (dx++ < a) {
	        /* fehlerhafter Abbruch bei flachen Ellipsen (b=1) */
            pixelFunc(xm + dx, ym, color); /* -> Spitze der Ellipse vollenden */
            pixelFunc(xm - dx, ym, color);
	    }
	    
	    return this;
	}

}
