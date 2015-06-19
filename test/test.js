"use strict";

var assert = require("assert");
var rasterImage = require('../').rasterImage;

describe('rasterImage', function () {
    
    describe('constructor', function () {
        it("throws an exception when constructed without proper dimensions", function () {
            
            var schmoo = function () {
                var img = new rasterImage();
            }
            var schmoo2 = function () {
                var img = new rasterImage(-1, 1000);
            }
            var schmoo3 = function () {
                var img = new rasterImage(100);
            }
            var schmoo4 = function () {
                var img = new rasterImage(NaN, NaN);
            }
            assert.throws(schmoo);
            assert.throws(schmoo2);
            assert.throws(schmoo3);
            assert.throws(schmoo4);
        });
        
        it("allocates the correct buffer size", function () {
            
            var img = new rasterImage(100, 100);
            assert.equal(img.data.byteLength, 100 * 100 * 4);
        });

        it("recycles existing ArrayBuffer", function () {
            var rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255];
            var ab = new ArrayBuffer(2 * 2 * 4);
            
            var img = new rasterImage(2, 2, ab);

            assert.equal(img.buffer, ab);
        });

        it("recycles existing Uint8ClampedArray", function () {
            var rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255];
            
            var cl = new Uint8ClampedArray(rgba);
            var img = new rasterImage(2, 2, cl);
            assert.equal(img.data, cl);
        });
    });
    
    describe('.clear', function () {
        it('sets pixel data correctly', function () {
            var img = new rasterImage(2, 2);
            img.clear({ r: 1, g: 2, b: 3, a: 4 });
            
            assert.equal(img.data[0],1);
            assert.equal(img.data[1],2);
            assert.equal(img.data[2],3);
            assert.equal(img.data[3],4);
        });
    });
    
    describe(".invert", function () {
        it('sets pixel data correctly', function () {
            var img = new rasterImage(2, 2);
            img.clear({ r: 255 }).invert();
            
            assert.equal(img.data[0],0);
            assert.equal(img.data[1],255);
            assert.equal(img.data[2],255);
            assert.equal(img.data[3],255);
            
            assert.equal(img.data[4],0);
            assert.equal(img.data[5],255);
            assert.equal(img.data[6],255);
            assert.equal(img.data[7],255);
        });
    });
    
    describe(".setPixel", function () {
        it("sets pixel data correctly", function () {
            var img = new rasterImage(2, 2);
            img.clear({ r: 0, g: 0, b: 0, a: 255 });
            img.setPixel(0, 0, { r: 1, g: 2, b: 3, a: 4 });
            
            assert.equal(img.data[0],1);
            assert.equal(img.data[1],2);
            assert.equal(img.data[2],3);
            assert.equal(img.data[3],4);
            
            assert.equal(img.data[4],0);
            assert.equal(img.data[5],0);
            assert.equal(img.data[6],0);
            assert.equal(img.data[7],255);
        });
    });
    
    describe('.getPixel', function () {
        it("returns correct data", function () {
            var img = new rasterImage(2, 2);
            img.data[0] = 1;
            img.data[1] = 2;
            img.data[2] = 3;
            img.data[3] = 4;
            
            assert.deepEqual(img.getPixel(0, 0), { r: 1, g: 2, b: 3, a: 4 });
        });
        
        it('returns null when out of bounds', function () {
            var img = new rasterImage(2, 2);
            
            assert.equal(img.getPixel(-1, 0),null);
            assert.equal(img.getPixel(2, 0),null);
            assert.equal(img.getPixel(0, -1),null);
            assert.equal(img.getPixel(0, 2),null);
        });
    });

    describe('.use', function(){
         it('Calls the plugins\' init function if available', function(){
            var wasCalled = false;
            var plugin = {init: function(foo){wasCalled = foo == rasterImage;}};
            rasterImage.use(plugin);
            assert.equal(wasCalled, true);
        });
    });
});
