'use strict';

var fs = require('fs');
var pics = require('pics');
var concat = require('concat-frames');

// register some image codecs
pics.use(require('gif-stream'));
pics.use(require('jpg-stream'));
pics.use(require('png-stream'));

exports.init = function (rasterImage) {
    rasterImage.load = function (what, cb) {
        var file = fs.createReadStream(what);
        var decoder = pics.decode();
        var concatter = concat(function (frames) {
            
            var frame = frames[0];
            if (frame.colorSpace == 'rgb') {
                var tmp = rasterImage.fromRgb(frame.width, frame.height, frame.pixels);
                cb(null, tmp);
            } else if (frame.colorSpace == 'rgba') {
                var tmp = rasterImage.fromRgba(frame.width, frame.height, frame.pixels);
                cb(null, tmp);
            } else {
                cb(new Error('ColorSpace ' + frame.colorSpace + ' is not supported'), null);
            }
        });
        
        file.pipe(decoder).pipe(concatter);
    };
    
    rasterImage.prototype.save = function (where, format, cb) {
        var stream = null;
        if (typeof (where) === "string") {
            stream = fs.createWriteStream(where);
        } else if (where instanceof (Writable)) {
            stream = where;
        }
        
        if (stream != null) {
            var encoder = pics.encode(format, { width: this.width, height: this.height, colorSpace: 'rgba' });
            var buf = new Buffer(this.data8);
            encoder.write(buf);
            encoder.pipe(stream);
            encoder.end(null, null, function (err) {
                cb(err);
            });
        } else {
            cb(new Error("Cannot write to target of type " + typeof (where)));
        }
    }
}
