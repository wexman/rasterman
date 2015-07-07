var open = require('open');

var rasterImage = require('../rasterman.js');

rasterImage.use(require('../rasterman-pics.js'));			// load the pics-plugin
rasterImage.use(require('../rasterman-draw.js'));			// load the drawing-plugin

var img = new rasterImage(1024, 768);						// create a new (empty) image
img.clear([255,255,255,255]); 								// fill it with a solid white background

img.drawEllipse(250,250,100,100,[0,255,0,255], true);		// and a green circle
img.drawRect(50, 50, 200, 200, [0,0,255,127]);				// draw a blue rectangle on it

img.save('test.png', 'image/png', function(err){			// and save our wonderful art to disk
	if(err==null)
	{
		console.log('file saved!');
		open('test.png');
	}
});
