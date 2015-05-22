"use strict";

var Buffer = require('buffer').Buffer;
var Benchmark = require('benchmark').Benchmark;

var width = 1024;
var height = 768;
var numPixels = width * height;
var BYTES_PER_PIXEL = 4;
var arrayLen = numPixels * BYTES_PER_PIXEL;

var buffer = new Buffer(arrayLen);
var arrayBuffer = new ArrayBuffer(arrayLen);
var arr8 = new Uint8ClampedArray(arrayBuffer);
var arr32 = new Uint32Array(arrayBuffer);
var view = new DataView(arrayBuffer);
var suite = new Benchmark.Suite;


var LittleBigByte = function (i) {
    var j = ((i & 0xff000000) >> 24) | ((i & 0xff0000) >> 8) | ((i & 0xff00) << 8) | ((i & 0xff) << 24);
    return j;
}

var getLittlePixel = function (ndx) {
    var c = arr32[ndx];
    return c;
}

var getBigPixel = function (ndx) {
    var c = arr32[ndx];
    return LittleBigByte(c);
}

var setLittlePixel = function (ndx, color) {
    arr32[ndx] = color;
}

var setBigPixel = function (ndx, color) {
    arr32[ndx] = LittleBigByte(color);
}

//var getPixel = getLittlePixel;
//var setPixel = setLittlePixel;

console.log(numPixels);

suite
//.add('ArrayBuffer+Uint8Array, single loop, plus', function () {     // ==>fastest, endian-correct version
//    for (var i = 0; i < arr8.length; i += 4) {
//        var r = arr8[i];
//        var g = arr8[i + 1];
//        var b = arr8[i + 2];
//        var a = arr8[i + 3];
//        arr8[i] = a;
//        arr8[i + 1] = b;
//        arr8[i + 2] = g;
//        arr8[i + 3] = r;
//    }
//})
//.add('ArrayBuffer+Uint8Array, single loop, mult', function () {     // ==>fastest, endian-correct version
//    for (var i = 0; i < numPixels; i++) {
//        var offset = i * BYTES_PER_PIXEL;
//        var r = arr8[offset];
//        var g = arr8[offset + 1];
//        var b = arr8[offset + 2];
//        var a = arr8[offset + 3];
//        arr8[offset] = a;
//        arr8[offset + 1] = b;
//        arr8[offset + 2] = g;
//        arr8[offset + 3] = r;
//    }
//})
//.add('ArrayBuffer+Uint8Array, double loop', function () {
//    for (var y = 0; y < height; y++) {
//        for (var x = 0; x < width; x++) {
//            var offset = (y * width + x) * BYTES_PER_PIXEL;
//            var r = arr8[offset];
//            var g = arr8[offset + 1];
//            var b = arr8[offset + 2];
//            var a = arr8[offset + 3];
//            arr8[offset] = a;
//            arr8[offset + 1] = b;
//            arr8[offset + 2] = g;
//            arr8[offset + 3] = r;
//        }
//    }
//})
//.add('ArrayBuffer+Uint8Array, optimized double loop', function () {
//    for (var y = 0; y < height; y++) {
//        var yw = y * width;
//        for (var x = 0; x < width; x++) {
//            var offset = (yw + x) * BYTES_PER_PIXEL;
//            var r = arr8[offset];
//            var g = arr8[offset + 1];
//            var b = arr8[offset + 2];
//            var a = arr8[offset + 3];
//            arr8[offset] = a;
//            arr8[offset + 1] = b;
//            arr8[offset + 2] = g;
//            arr8[offset + 3] = r;
//        }
//    }
//})
//.add('ArrayBuffer+Uint32Array, double loop', function () {
//    for (var y = 0; y < height; y++) {
//        for (var x = 0; x < width; x++) {
//            var offset = (y * width + x);
//            var c = arr32[offset];
//            var r = c & 255;
//            var g = (c >> 8) & 255;
//            var b = (c >> 16) & 255;
//            var a = (c >> 24) & 255;
//            c = (a
//            << 24) | (b << 16) | (g << 8) | r;
//            arr32[offset] = c;
//        }
//    }
//})
//.add('ArrayBuffer+Uint32Array, optimized double loop', function () {
//    for (var y = 0; y < height; y++) {
//        var yw = y * width;
//        for (var x = 0; x < width; x++) {
//            var offset = (yw + x);
//            var c = arr32[offset];
//            var r = c & 255;
//            var g = (c >> 8) & 255;
//            var b = (c >> 16) & 255;
//            var a = (c >> 24) & 255;
//            c = (a
//                << 24) | (b << 16) | (g << 8) | r;
//            arr32[offset] = c;
//        }
//    }
//})
.add('ArrayBuffer+Uint32Array, single loop', function () {
    for (var i = 0; i < numPixels; i++) {
        var c = arr32[i];
        var r = c & 255;
        var g = (c >> 8) & 255;
        var b = (c >> 16) & 255;
        var a = (c >> 24) & 255;
        c = (a << 24) | (b << 16) | (g << 8) | r;
        arr32[i] = c;
    }
})
.add('ArrayBuffer+Uint32Array, endianCorrect without conversion', function () {
    var a = numPixels;
    for (var i = 0; i < numPixels; i++) {
        var c = getLittlePixel(i);
        var r = c & 255;
        var g = (c >> 8) & 255;
        var b = (c >> 16) & 255;
        var a = (c >> 24) & 255;
        c = (a << 24) | (b << 16) | (g << 8) | r;
        setLittlePixel(i, c);
    }
})
.add('ArrayBuffer+Uint32Array, endianCorrect with conversion', function () {
    for (var i = 0; i < numPixels; i++) {
        var c = getBigPixel(i);
        var r = c & 255;
        var g = (c >> 8) & 255;
        var b = (c >> 16) & 255;
        var a = (c >> 24) & 255;
        c = (a << 24) | (b << 16) | (g << 8) | r;
        setBigPixel(i, c);
    }
})
//.add('ArrayBuffer+Uint32Array, endianAwareInline', function () {
//    for (var i = 0; i < numPixels; i++) {
//        var c = arr32[i];
//        var result = {
//            r: c & 255,
//            g: (c >> 8) & 255,
//            b: (c >> 16) & 255,
//            a: (c >> 24) & 255
//        }
//        var c2 = result.r | result.g << 8 | result.b << 16 | result.a << 24;
//        arr32[i] = c2;
//    }
//})
//.add('Buffer, 8bit indexer, double loop', function () {
//    for (var y = 0; y < height; y++) {
//        for (var x = 0; x < width; x++) {
//            var offset = (y * width + x) * BYTES_PER_PIXEL;
//            var r = buffer[offset];
//            var g = buffer[offset + 1];
//            var b = buffer[offset + 2];
//            var a = buffer[offset + 3];
//            buffer[offset] = a;
//            buffer[offset + 1] = b;
//            buffer[offset + 2] = g;
//            buffer[offset + 3] = r;
//        }
//    }
//})
//.add('Buffer,  8bit indexer, optimized double loop', function () {
//    for (var y = 0; y < height; y++) {
//        var yw = y * width * 4;
//        for (var x = 0; x < width; x++) {
//            var offset = yw + (x * BYTES_PER_PIXEL);
//            var r = buffer[offset];
//            var g = buffer[offset + 1];
//            var b = buffer[offset + 2];
//            var a = buffer[offset + 3];
//            buffer[offset] = a;
//            buffer[offset + 1] = b;
//            buffer[offset + 2] = g;
//            buffer[offset + 3] = r;
//        }
//    }
//})
//.add('Buffer, 32bitBE, double loop', function () {
//    for (var y = 0; y < height; y++) {
//        for (var x = 0; x < width; x++) {
//            var offset = (y * width + x) * BYTES_PER_PIXEL;
//            var c = buffer.readInt32BE(offset, true);
//            var r = c & 255;
//            var g = (c >> 8) & 255;
//            var b = (c >> 16) & 255;
//            var a = (c >> 24) & 255;
//            c = (a << 24) | (b << 16) | (g << 8) | r;
//            buffer.writeInt32BE(c, offset, true);
//        }
//    }
//})
//.add('Buffer, 32bitLE, double loop', function () {
//    for (var y = 0; y < height; y++) {
//        for (var x = 0; x < width; x++) {
//            var offset = (y * width + x) * BYTES_PER_PIXEL;
//            var c = buffer.readInt32LE(offset, true);
//            var r = c & 255;
//            var g = (c >> 8) & 255;
//            var b = (c >> 16) & 255;
//            var a = (c >> 24) & 255;
//            c = (a << 24) | (b << 16) | (g << 8) | r;
//            buffer.writeInt32LE(c, offset, true);
//        }
//    }
//})
//.add('ArrayBuffer+DataView with 32bit single loop', function () {   //       ==>fastest overall, but big endian problems
//    for (var i = 0; i < numPixels; i++) {
//        var offset = i * 4;
//        var c = view.getUint32(offset);
//        var r = c & 255;
//        var g = (c >> 8) & 255;
//        var b = (c >> 16) & 255;
//        var a = (c >> 24) & 255;
//        c = (a << 24) | (b << 16) | (g << 8) | r;
//        view.setUint32(c, offset);
//    }
//})
.on('cycle', function (event) {
    console.log(String(event.target));
})
.on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run({ 'async': false });
console.log('Fertich');
