'use strict';

var util = require('util');

var BYTES_PER_PIXEL = 4;

/** 
 * Creates a new raster image
 * @constructor
 * @param {number} width The with of the new image, in pixels
 * @param {number} height The height of the new image, in pixels
 * @param {Array} [data] Pixel data in rgba format
 */
var rasterImage = function (width, height, data) {
    
    if (!(this instanceof rasterImage)) return new rasterImage(width, height, data);
    
    if (!(width > 0 && height > 0))
        throw new Error('Invalid dimensions');
    
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.numPixels = this.width * this.height;
    
    var len = this.numPixels * BYTES_PER_PIXEL;
    
    if (data) { // if data was passed, it must be array-like and have the correct length
        
        // special cases: these instances can be used directly (without copying), so let's do that...
        if (data instanceof Uint8ClampedArray && data.length == len) {
            this.buffer = data.buffer;
            this.data = data;
            this.data32 = new Uint32Array(this.buffer);
        } else if (data instanceof ArrayBuffer && data.byteLength == len) {
            this.buffer = data;
            this.data = new Uint8ClampedArray(this.buffer);
            this.data32 = new Uint32Array(this.buffer);
        } else if (data.length == len) {
            this.buffer = new ArrayBuffer(len);
            this.data = new Uint8ClampedArray(this.buffer);
            this.data32 = new Uint32Array(this.buffer);
            
            for (var i = 0; i < data.length; i++) {
                this.data[i] = data[i];
            }
        }
    } else {
        this.buffer = new ArrayBuffer(len);
        this.data = new Uint8ClampedArray(this.buffer);     // for per-channel pixel access
        this.data32 = new Uint32Array(this.buffer);         // for fast per-pixel access (endian-ignorant)
    }
}

rasterImage.prototype._replaceBuffer = function (newBuffer, newWidth, newHeight) {
    if (newBuffer instanceof ArrayBuffer) {
        this.buffer = newBuffer;
        this.data = new Uint8ClampedArray(this.buffer);
        this.data32 = new Uint32Array(this.buffer);
        
        if (newWidth && newHeight) {
            this.width = Math.floor(newWidth);
            this.height = Math.floor(newHeight);
            this.numPixels = this.width * this.height;
        }
    } else {
        throw new Error('newBuffer must be an ArrayBuffer');
    }
}

rasterImage.use = function(plugin)
{
    if(util.isFunction(plugin.init))
		plugin.init(rasterImage);
}

/**
 * Provides reasonable default values for color.
 * @private
 */
rasterImage.prototype._sanitize = function (color) {
    
    var result = {
        r: color.r || 0,
        g: color.g || 0,
        b: color.b || 0,
        a: color.a || 255
    };
    return result;
}

/**
 * Sets all pixels of an image to a specified color.
 * @param {object} color The color to set the pixels to. Must have r, g, b and/or a properties.
 */
rasterImage.prototype.clear = function (color) {
    var c = this._sanitize(color);
    
    for (var i = 0; i < this.data.length; i += 4) {
        this.data[i] = c.r;
        this.data[i + 1] = c.g;
        this.data[i + 2] = c.b;
        this.data[i + 3] = c.a;
    }
    
    return this;
}

/** 
 * Inverts the colors in a raster image
 */
rasterImage.prototype.invert = function () {
    for (var i = 0; i < this.data.length; i += 4) {
        this.data[i] = 255 - this.data[i];
        this.data[i + 1] = 255 - this.data[i + 1];
        this.data[i + 2] = 255 - this.data[i + 2];
    }
    return this;
}

/**
 * Converts a raster image to grayscale by weighting the r, g and b colors
 * @param {object} options
 */
rasterImage.prototype.grayscale = function () {
    
    var weights = {
        r: 0.2126,
        g: 0.7152,
        b: 0.0722
    };
    
    for (var i = 0; i < this.data.length; i += 4) {
        var r = this.data[i] * weights.r;
        var g = this.data[i + 1] * weights.g;
        var b = this.data[i + 2] * weights.b;
        
        var l = r + g + b;
        
        this.data[i] = this.data[i + 1] = this.data[i + 2] = l;
    }
    
    return this;
}

/**
 * Sets a pixel in a raster image to a given color.
 */
rasterImage.prototype.setPixel = function (x, y, color) {
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return;
    
    var c = this._sanitize(color);
    
    this._setPixel(x, y, color);
    return this;
}

/** 
 * Sets a pixel in a raster image to a given color. No range checks; faster, but might throw an exception.
 * @private
 */
rasterImage.prototype._setPixel = function (x, y, color) {
    var offset = (y * this.width + x) * BYTES_PER_PIXEL;
    this.data[offset] = color.r;
    this.data[offset + 1] = color.g;
    this.data[offset + 2] = color.b;
    this.data[offset + 3] = color.a;
}

/**
 * Retrieves the color of a pixel in a raster image.
 * @param {number} x The x coordinate of the pixel.
 * @param {number} y The y coordinate of the pixel.
 * @returns {object} An object representing the color of the pixel with the r, g, b and a members set accordingly.
 */
rasterImage.prototype.getPixel = function (x, y) {
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return null;
    
    x = Math.floor(x);
    y = Math.floor(y);
    
    var offset = (y * this.width + x) * BYTES_PER_PIXEL;
    var result = {
        r: this.data[offset],
        g: this.data[offset + 1],
        b: this.data[offset + 2],
        a: this.data[offset + 3]
    };
    
    return result;
}

/**
 * Draws a line on a raster image.
 * @param {number} x0 The x coordinate of the starting point
 * @param {number} y0 The y coordinate of the starting point
 * @param {number} x1 The x coordinate of the ending point
 * @param {number} y1 The y coordinate of the ending point
 * @param {object} color An object representing the color of the line
 * @returns The raster image itself (for chaining)
 */
rasterImage.prototype.drawLine = function (x0, y0, x1, y1, color) {
    
    color = this._sanitize(color);
    
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;
    
    while (true) {
        
        this.setPixel(x0, y0, color);
        
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
    color = this._sanitize(color);
    
    var l = Math.max(0, x);
    var t = Math.max(0, y);
    
    var r = Math.min(this.width, l + width);
    var b = Math.min(this.height, t + height);
    
    var pixelFunc = rasterImage.prototype.setPixel.bind(this);
    if (color.a < 255)
        pixelFunc = rasterImage.prototype.drawPixel.bind(this);
    
    for (var y = t; y < b; y++) {
        for (var x = l; x < r; x++) {
            pixelFunc(x, y, color);
        }
    }
    
    return this;
}

/**
 * Creates a raster image from an array(-like) of RGB data
 * @param {number} width The width of the images (in pixels)
 * @param {number} height The height of the images (in pixels)
 * @param {array-like} data An array (or alike, with length property and indexer) with the pixel data in RGB format
 * @returns The newly created raster image
 */
rasterImage.fromRgb = function (width, height, data) {
    var w = Math.floor(width);
    var h = Math.floor(height);
    var numPixels = w * h;
    
    if (data.length != numPixels * 3) {
        throw new Error('Array size mismatch');
    }
    var tmp = new Uint8ClampedArray(numPixels * BYTES_PER_PIXEL);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        for (var x = 0; x < w; x++) {
            var srcOffset = (x + yw) * 3;
            var dstOffset = (x + yw) * 4;
            
            tmp[dstOffset] = data[srcOffset];
            tmp[dstOffset + 1] = data[srcOffset + 1];
            tmp[dstOffset + 2] = data[srcOffset + 2];
            tmp[dstOffset + 3] = 255;
        }
    }
    
    return new rasterImage(w, h, tmp);
}


rasterImage.fromRgba = function (width, height, data) {
    var w = Math.floor(width);
    var h = Math.floor(height);
    var numPixels = w * h;
    
    if (data.length != numPixels * BYTES_PER_PIXEL) {
        throw new Error('Array size mismatch');
    }
    
    var tmp = Uint8ClampedArray.from(data);
    return new rasterImage(w, h, tmp);
}


/**
 * Rotates an image by 90 degrees counter clockwise
 */
rasterImage.prototype.rotateLeft = function () {
    
    var w = this.width;
    var h = this.height;
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        for (var x = 0; x < w; x++) {
            var l = this.data32[yw + x];
            tmp32[x * h + y] = l;
        }
    }
    
    this._replaceBuffer(tmp, h, w);		// swap width and height
    
    return this;
}

/**
 * Rotates an image by 90 degrees clockwise
 */
rasterImage.prototype.rotateRight = function () {
    
    var w = this.width;
    var h = this.height;
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        for (var x = 0; x < w; x++) {
            var l = this.data32[yw + x];
            tmp32[x * h + (h - y - 1)] = l;
        }
    }
    
    this._replaceBuffer(tmp, h, w);		// swap width and height
    
    return this;
}

/**
 * Rotates an image by 180 degrees
 */
rasterImage.prototype.rotate180 = function () {
    
    var w = this.width;
    var h = this.height;
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        var hyw = (h - y - 1) * w;
        for (var x = 0; x < w; x++) {
            var l = this.data32[yw + x];
            tmp32[hyw + w - x - 1] = l;
        }
    }
    
    this._replaceBuffer(tmp);
    return this;
}

/**
 * Flips an image horizontally
 */
rasterImage.prototype.flipHorizontally = function () {
    
    var w = this.width;
    var h = this.height;
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        for (var x = 0; x < w; x++) {
            
            var ol = (yw + x);
            var or = (yw + w - x - 1);
            
            var l = this.data32[ol];
            
            tmp32[or] = l;
        }
    }
    
    this._replaceBuffer(tmp);
    return this;
}

/**
 * Flips an image vertically
 */
rasterImage.prototype.flipVertically = function () {
    
    var w = this.width;
    var h = this.height;
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var y = 0; y < h; y++) {
        var yw = y * w;
        var hyw = (h - y - 1) * w;
        for (var x = 0; x < w; x++) {
            
            var ot = (yw + x);
            var ob = (hyw + x);
            
            tmp32[ob] = this.data32[ot];
        }
    }
    
    this._replaceBuffer(tmp);
    return this;
}

rasterImage.prototype.crop = function (x, y, w, h) {
    
    h = Math.max(0, Math.min(Math.floor(h || this.height), this.height));
    w = Math.max(0, Math.min(Math.floor(w || this.width), this.width));
    x = Math.max(0, Math.min(Math.floor(x || 0), this.width));
    y = Math.max(0, Math.min(Math.floor(y || 0), this.height));
    
    var tmp = new ArrayBuffer(w * h * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);
    
    for (var i = 0; i < h; i++) {
        for (var j = 0; j < w; j++) {
            var srcOffset = ((y + i) * this.width + x + j);
            var dstOffset = (i * w + j);
            
            var c = this.data32[srcOffset];
            tmp32[dstOffset] = c;
        }
    }
    
    this._replaceBuffer(tmp, w, h);
    return this;
}

rasterImage.prototype.toRgb = function () {
    var tmp = new ArrayBuffer(this.numPixels * 3);
    
    for (var y = 0; y < this.height; y++) {
        var yw = y * this.width;
        for (var x = 0; x < this.width; x++) {
            var srcOffset = (x + yw) * 4;
            var dstOffset = (x + yw) * 3;
            
            tmp[dstOffset] = this.data[srcOffset];
            tmp[dstOffset + 1] = this.data[srcOffset + 1];
            tmp[dstOffset + 2] = this.data[srcOffset + 2];
        }
    }
    return tmp;
}

/** 
 * Resizes a raster image using the "nearest neighbour" algorithm (which is fast, but low quality)
 */
rasterImage.prototype.resize_nearest = function (newWidth, newHeight) {
    
    var tmp = new ArrayBuffer(newWidth * newHeight * BYTES_PER_PIXEL);
    var tmp32 = new Uint32Array(tmp);

    var x_ratio = ((this.width << 16) / newWidth) + 1;
    var y_ratio = ((this.height << 16) / newHeight) + 1;
    
    var x2, y2;
    for (var i = 0; i < newHeight; i++) {
        y2 = ((i * y_ratio) >> 16);
        for (var j = 0; j < newWidth; j++) {
            x2 = ((j * x_ratio) >> 16);
            
            var schmp = this.data32[(y2 * this.width + x2)];
            tmp32[i * newWidth + j] = schmp;
        }
    }

    this._replaceBuffer(tmp, newWidth, newHeight);
    return this;
}

rasterImage.prototype.resize_bilinear = function (newWidth, newHeight) {
    
    var newImage = new rasterImage(newWidth, newHeight);
    
    var w = this.width,
        h = this.height,
        w2 = newImage.width,
        h2 = newImage.height;
    var a, b, c, d, x, y, index;
    
    var x_ratio = (w - 1) / w2;
    var y_ratio = (h - 1) / h2;
    var x_diff, y_diff, blue, red, green, alpha;
    
    var offset = 0;
    for (var i = 0; i < h2; i++) {
        for (var j = 0; j < w2; j++) {
            x = Math.floor(x_ratio * j);
            y = Math.floor(y_ratio * i);
            x_diff = (x_ratio * j) - x;
            y_diff = (y_ratio * i) - y;
            
            index = (y * w + x);
            
            // it is safe to use the 32bit access here since we're treating all channels the same way, so it doesn't matter if it's red or alpha, green or blue
            a = this.data32[index];
            b = this.data32[index + 1];
            c = this.data32[index + w];
            d = this.data32[index + w + 1];
            
            blue = (a & 0xff) * (1 - x_diff) * (1 - y_diff) + (b & 0xff) * (x_diff) * (1 - y_diff) + (c & 0xff) * (y_diff) * (1 - x_diff) + (d & 0xff) * (x_diff * y_diff);
            green = ((a >> 8) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >> 8) & 0xff) * (x_diff) * (1 - y_diff) + ((c >> 8) & 0xff) * (y_diff) * (1 - x_diff) + ((d >> 8) & 0xff) * (x_diff * y_diff);
            red = ((a >> 16) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >> 16) & 0xff) * (x_diff) * (1 - y_diff) + ((c >> 16) & 0xff) * (y_diff) * (1 - x_diff) + ((d >> 16) & 0xff) * (x_diff * y_diff);
            alpha = ((a >> 24) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >> 24) & 0xff) * (x_diff) * (1 - y_diff) + ((c >> 24) & 0xff) * (y_diff) * (1 - x_diff) + ((d >> 24) & 0xff) * (x_diff * y_diff);
            newImage.data32[offset++] = alpha << 24 | red << 16 | green << 8 | blue;
        }
    }
    return newImage;
}


rasterImage.prototype.drawEllipse = function (xm, ym, a, b, color, fill) {
    
    color = this._sanitize(color);
    
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
            this.setPixel(xm + dx, ym + dy, color); /* I. Quadrant */
            this.setPixel(xm - dx, ym + dy, color); /* II. Quadrant */
            this.setPixel(xm - dx, ym - dy, color); /* III. Quadrant */
            this.setPixel(xm + dx, ym - dy, color); /* IV. Quadrant */
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
        setPixel(xm + dx, ym, color); /* -> Spitze der Ellipse vollenden */
        setPixel(xm - dx, ym, color);
    }
    
    return this;
}

/**
 * Alpha-blends a pixel in a raster image with the given color
 */
rasterImage.prototype.drawPixel = function (x, y, color) {
    throw new Error("Not (yet) implemented");
}

module.exports.rasterImage = rasterImage;
