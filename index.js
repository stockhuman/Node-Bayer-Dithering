const sharp = require('sharp')
const input = process.argv[2] || null

// exit early if not input is supplied
if (!input) {
	console.log('No input specified!\n')
	process.exit(404)
}

// name the output file
const output = `dither_${ Date.now() - 1561471500000 }.png`

// dithering function, working off a sharp.js meta object + buffer data
const dither = ({height, width, buffer}) => {

	// performs pattern lookup
	const bayer = (x, y, c0) => {
		const clamp = val => (val < 0 ? 0 : val > 255 ? 255 : val)
		// via http://devlog-martinsh.blogspot.com/2011/03/glsl-8x8-bayer-matrix-dithering.html
		const pattern = [
			[ 0, 32,  8, 40,  2, 34, 10, 42],   /* 8x8 Bayer ordered dithering  */
			[48, 16, 56, 24, 50, 18, 58, 26],   /* pattern.  Each input pixel   */
			[12, 44,  4, 36, 14, 46,  6, 38],   /* is scaled to the 0..63 range */
			[60, 28, 52, 20, 62, 30, 54, 22],   /* before looking in this table */
			[ 3, 35, 11, 43,  1, 33,  9, 41],   /* to determine the action.     */
			[51, 19, 59, 27, 49, 17, 57, 25],
			[15, 47,  7, 39, 13, 45,  5, 37],
			[63, 31, 55, 23, 61, 29, 53, 21]
		]

		// dithers to 100% black or white
		if (clamp(c0 + pattern[x % 8][y % 8]) > 127) {
			return 255
		} else return 0
	}

	// given Sharp data object with width, height and raw-formatted uint8 buffer
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let index = x + y * width // get position in 1d buffer array
			buffer[index] = bayer(x, y, buffer[index])
		}
	}

	return buffer;
}

let meta = {}

sharp(input)
	.normalise()
	.toColourspace('b-w')
	.metadata((err, metadata) => {
		if (err) console.log(err)
		else meta = metadata
	})
	.raw()
	.toBuffer()
	.then(buffer => {
		sharp(new Buffer.from(dither({...meta, buffer})), {
			raw: {
				width: meta.width,
				height: meta.height,
				channels: 1,
			}
		})
		.png()
		.toFile(output, err => { err ? console.log(err) : null })
	})

// output files are astoundingly small given pixel dimensions
