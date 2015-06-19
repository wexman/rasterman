var path = require('path');

var rasterImage = require('../rasterman.js').rasterImage;

rasterImage.use(require('../rasterman-pics.js'));	// load the pics-plugin

rasterImage.load(path.resolve(__dirname, 'monalisa.jpg'), function(err, img){
	if(err==null)
	{
		console.log('image successfully loaded, processing...');
		img.invert().rotate180().resize_nearest(800, 600);
		console.log('done');
		img.save('test.png', 'image/png', function(err){
			if(err)
				console.log(err);
			else
				console.log('image successfully saved');
		});
	}
	else
		console.log('Failed to load image');
});
