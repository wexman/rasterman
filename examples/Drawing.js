var rasterImage = require('../rasterman.js');

rasterImage.use(require('../rasterman-pics.js'));			// load the pics-plugin
rasterImage.use(require('../rasterman-draw.js'));			// load the drawing-plugin

var img = new rasterImage(1024, 768);						// create a new (empty) image

img.clear({a: 255, r: 255, g: 255, b: 255}); 				// fill it with a solid white background
img.drawRect(50, 50, 200, 200, {a: 255, b: 255});			// draw a blue rectangle on it
img.drawEllipse(250,250,100,100,{a: 255, g: 255}, true);	// and a green circle

img.save('test.png', 'image/png', function(err){			// and save our wonderful art to disk
	console.log('file saved!');
});
