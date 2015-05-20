var fs = require('fs');
var pics = require('pics');
var concat = require('concat-frames');

var rasterImage = require('../src/rasterman.js').rasterImage;


var buff = [255, 0, 0, 255, 255, 0,0, 255, 255, 0, 0, 255, 255, 0, 0, 255];

var img = new rasterImage(2, 2, buff);

var rgb = img.toRgb();


function save(img, filename) {
    
    try {
        var encoder = pics.encode('image/png', { width: img.width, height: img.height, colorSpace: 'rgba' });
        
        var file = fs.createWriteStream(filename);
        
        var buf = new Buffer(img.data);
        encoder.write(buf);
        encoder.pipe(file);
    }
    catch (err) {
        console.error(err);
    }
}
