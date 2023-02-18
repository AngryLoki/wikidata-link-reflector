const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				slate: {
					150: '#EAEFF5',
					250: '#D7DFE9',
					350: '#B0BCCD',
					450: '#7C8CA2',
					550: '#56657A',
					650: '#3D4B5F',
					750: '#293548',
					850: '#172033',
					950: '#0A0F1C',
				},
				gray: {
					150: '#ECEEF1',
					250: '#DBDEE3',
					350: '#B7BCC5',
					450: '#848B98',
					550: '#5B6472',
					650: '#414B5A',
					750: '#2B3544',
					850: '#18212F',
					950: '#090C14',
				},
			},
		},
	},
	plugins: [
		plugin(({addBase}) => {
			addBase({
				html: {fontSize: '14px'},
			});
		}),
	],
	experimental: {
		optimizeUniversalDefaults: true,
	},
};
