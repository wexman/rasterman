'use strict';

var util = require('util');

var BYTES_PER_PIXEL = 4;

var R = 0, G = 1, B = 2, A = 3;

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
            this.data8 = data;
            this.data32 = new Uint32Array(this.buffer);
        } else if (data instanceof ArrayBuffer && data.byteLength == len) {
            this.buffer = data;
            this.data8 = new Uint8ClampedArray(this.buffer);
            this.data32 = new Uint32Array(this.buffer);
        } else if (data.length == len) {
            this.buffer = new ArrayBuffer(len);
            this.data8 = new Uint8ClampedArray(this.buffer);
            this.data32 = new Uint32Array(this.buffer);
            
            for (var i = 0; i < data.length; i++) {
                this.data8[i] = data[i];
            }
        }
    } else {
        this.buffer = new ArrayBuffer(len);
        this.data8 = new Uint8ClampedArray(this.buffer);     // for per-channel pixel access
        this.data32 = new Uint32Array(this.buffer);         // for fast per-pixel access (endian-ignorant)
    }
};

rasterImage.prototype._replaceBuffer = function (newBuffer, newWidth, newHeight) {
    if (newBuffer instanceof ArrayBuffer) {
        this.buffer = newBuffer;
        this.data8 = new Uint8ClampedArray(this.buffer);
        this.data32 = new Uint32Array(this.buffer);
        
        if (newWidth && newHeight) {
            this.width = Math.floor(newWidth);
            this.height = Math.floor(newHeight);
            this.numPixels = this.width * this.height;
        }
    } else {
        throw new Error('newBuffer must be an ArrayBuffer');
    }
};

/**
 * Initializes a plugin
 */
rasterImage.use = function (plugin) {
    if (util.isFunction(plugin.init))
        plugin.init(rasterImage);
};

/**
 * Provides reasonable default values for color.
 * @private
 */
rasterImage._colorify = function (color) {
    
    if (color instanceof Uint8ClampedArray && color.length === BYTES_PER_PIXEL) {
        console.log('Color already is Uint8ClampedArray');
        return color;
    } else if (util.isArray(color)) {
        // might instead use ArrayBuffer.transfer() on ES7
        console.log('Creating new ArrayBuffer from array');
        var b8 = new Uint8ClampedArray(new ArrayBuffer(BYTES_PER_PIXEL));
        b8[A] = 255; // default to opaque
        for (var i = 0; i < color.length && i < BYTES_PER_PIXEL; i++)
            b8[i] = color[i];
        return b8;
    } else if (typeof color === 'object') {
        console.log('Creating new ArrayBuffer from object');
        var b8 = new Uint8ClampedArray(new ArrayBuffer(BYTES_PER_PIXEL));
        b8[R] = color.r || color.red || 0;
        b8[G] = color.g || color.green || 0;
        b8[B] = color.b || color.blue || 0;
        b8[A] = color.a || color.alpha || 255; // default to opaque
        return b8;
    } else if (typeof color === 'string' || color instanceof String) {
        // do some parsing here, probably using another package...
    }
};

/**
 * Sets all pixels of an image to a specified color.
 * @param {object} color The color to set the pixels to. Must have r, g, b and/or a properties.
 */
rasterImage.prototype.clear = function (color) {
    var c8 = rasterImage._colorify(color);
    var c32 = new Uint32Array(c8.buffer);
    
    for (var i = 0; i < this.numPixels; i++) {
        this.data32[i] = c32[0];
    }
    
    return this;
};

/** 
 * Inverts the colors in a raster image
 */
rasterImage.prototype.invert = function () {
    for (var i = 0; i < this.data8.length; i += 4) {
        this.data8[i + R] = 255 - this.data8[i + R];
        this.data8[i + G] = 255 - this.data8[i + G];
        this.data8[i + B] = 255 - this.data8[i + B];
    }
    return this;
};

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
    
    for (var i = 0; i < this.data8.length; i += 4) {
        var r = this.data8[i + R] * weights.r;
        var g = this.data8[i + G] * weights.g;
        var b = this.data8[i + B] * weights.b;
        
        var l = r + g + b;
        
        //        this.data8.fill(l, i, i + 2); // seems to not be supported (yet?)
        this.data8[i + R] = this.data8[i + G] = this.data8[i + B] = l;
    }
    
    return this;
};

/**
 * Sets a pixel in a raster image to a given color.
 */
rasterImage.prototype.setPixel = function (x, y, color) {
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return;
    
    var c = rasterImage._colorify(color);
    
    this.__setPixel(x, y, c);
    return this;
};

/** 
 * Sets a pixel in a raster image to a given color. Only coordinates are checked for performance reasons. Thus might throw exceptions.
 * @private
 */
rasterImage.prototype._setPixel = function (x, y, color)
{
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return;

    this.__setPixel(x, y, color);
    return this;
};

/** 
 * Sets a pixel in a raster image to a given color. Neither coordinates nor color are checked for performance reasons. Thus might throw exceptions.
 * @private
 */
rasterImage.prototype.__setPixel = function (x, y, color) {
    var offset = (y * this.width + x) * BYTES_PER_PIXEL;
    this.data8.set(color, offset);
};

/**
 * Alpha-blends a pixel in a raster image with the given color
*/
rasterImage.prototype.blendPixel = function (x, y, color) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return;
    
    var c = rasterImage._colorify(color);
    
    this._blendPixel(x, y, c);
};

rasterImage.prototype._blendPixel = function (x, y, color) {
    
    var colorB = this.getPixel(x, y);
    var newColor = this._blend(color, colorB);
    this._setPixel(x, y, newColor);
};

/** Mixes two colors weighted by their alpha values
 * 
 */
rasterImage.prototype._blend = function (colorA, colorB) {
    var adiv = colorA[A] / 255;
    var bladiv = colorB[A] * (255 - colorA[A]) / (255 * 255);
    
    var rOut = (colorA[R] * adiv) + (colorB[R] * bladiv);
    var gOut = (colorA[G] * adiv) + (colorB[G] * bladiv);
    var bOut = (colorA[B] * adiv) + (colorB[B] * bladiv);
    var aOut = colorA[A] + (colorB[A] * (255 - colorA[A]) / 255);
    
    return [rOut, gOut, bOut, aOut];
};

/**
 * Retrieves the color of a pixel in a raster image.
 * @param {number} x The x coordinate of the pixel.
 * @param {number} y The y coordinate of the pixel.
 * @returns {object} An object representing the color of the pixel with the r, g, b and a members set accordingly. Returns undefined when out of bounds.
 */
rasterImage.prototype.getPixel = function (x, y) {
    
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return undefined;
    
    x = Math.floor(x);
    y = Math.floor(y);
    
    var offset = (y * this.width + x) * BYTES_PER_PIXEL;
    var result = [
        this.data8[offset + R],
        this.data8[offset + G],
        this.data8[offset + B],
        this.data8[offset + A]
    ];
    
    return result;
};

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
            
            tmp[dstOffset + R] = data[srcOffset + R];
            tmp[dstOffset + G] = data[srcOffset + G];
            tmp[dstOffset + B] = data[srcOffset + B];
            tmp[dstOffset + A] = 255;
        }
    }
    
    return new rasterImage(w, h, tmp);
};


rasterImage.fromRgba = function (width, height, data) {
    var w = Math.floor(width);
    var h = Math.floor(height);
    var numPixels = w * h;
    
    if (data.length != numPixels * BYTES_PER_PIXEL) {
        throw new Error('Array size mismatch');
    }
    
    var tmp = Uint8ClampedArray.from(data);
    return new rasterImage(w, h, tmp);
};

/**
 * Rotates an image by 270 degrees clockwise (or 90 degrees counter clockwise)
 */
rasterImage.prototype.rotate270 = function () {
    
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
};

/**
 * Rotates an image by 90 degrees clockwise
 */
rasterImage.prototype.rotate90 = function () {
    
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
};

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
};

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
};

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
};

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
};

rasterImage.prototype.toRgb = function () {
    var tmp = new ArrayBuffer(this.numPixels * 3);
    
    for (var y = 0; y < this.height; y++) {
        var yw = y * this.width;
        for (var x = 0; x < this.width; x++) {
            var srcOffset = (x + yw) * 4;
            var dstOffset = (x + yw) * 3;
            
            tmp[dstOffset + R] = this.data8[srcOffset + R];
            tmp[dstOffset + G] = this.data8[srcOffset + G];
            tmp[dstOffset + B] = this.data8[srcOffset + B];
        }
    }
    return tmp;
};

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
};

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
            
            blue   = (a & 0xff)        * (1 - x_diff) * (1 - y_diff) +  (b & 0xff)        * (x_diff) * (1 - y_diff) +  (c & 0xff)        * (y_diff) * (1 - x_diff) +  (d & 0xff)        * (x_diff * y_diff);
            green = ((a >>  8) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >>  8) & 0xff) * (x_diff) * (1 - y_diff) + ((c >>  8) & 0xff) * (y_diff) * (1 - x_diff) + ((d >>  8) & 0xff) * (x_diff * y_diff);
            red   = ((a >> 16) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >> 16) & 0xff) * (x_diff) * (1 - y_diff) + ((c >> 16) & 0xff) * (y_diff) * (1 - x_diff) + ((d >> 16) & 0xff) * (x_diff * y_diff);
            alpha = ((a >> 24) & 0xff) * (1 - x_diff) * (1 - y_diff) + ((b >> 24) & 0xff) * (x_diff) * (1 - y_diff) + ((c >> 24) & 0xff) * (y_diff) * (1 - x_diff) + ((d >> 24) & 0xff) * (x_diff * y_diff);
            newImage.data32[offset++] = alpha << 24 | red << 16 | green << 8 | blue;
        }
    }
    return newImage;
};

module.exports = rasterImage;
