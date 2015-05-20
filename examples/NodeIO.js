var fs = require('fs');
var pics = require('pics');
var concat = require('concat-frames');

var rasterImage = require('../src/rasterman.js').rasterImage;

// register some image codecs
pics.use(require('gif-stream'));
pics.use(require('jpg-stream'));
pics.use(require('png-stream'));

fs.createReadStream('examples/test.jpg')
  .pipe(pics.decode())
  .pipe(concat(function (frames) {
    
    var frame = frames[0];
    
    if (frame.colorSpace == 'rgb') {
        var tmp = rasterImage.fromRgb(frame.width, frame.height, frame.pixels);
        var resized = tmp.resize_nearest(80, 60);
        
        console.log(resized.width);
        console.log(resized.height);

        save(resized, 'C:\\temp\\fromrgb.png');
    }
}));


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
