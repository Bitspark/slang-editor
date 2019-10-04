module.exports = function(grunt) {
	require("load-grunt-tasks")(grunt);
	grunt.initConfig({
		ts: {
			default: {
				tsconfig: "./tsconfig.json",
				exclude: [
					"src/example/**",
					"src/bundle/**",
				],
			},
		},
		sass: {
			options: {
				implementation: require("node-sass"),
				sourceMap: true,
				importer: require("grunt-sass-tilde-importer"),
				style: "compressed",
			},
			dist: {
				files: {
					"./dist/styles/index.css": "./src/styles/index.scss",
				},
			},
		},
		cssmin: {
			options: {
				mergeIntoShorthands: false,
				roundingPrecision: -1,
			},
			target: {
				files: {
					"./dist/styles/index.css": "./dist/styles/index.css",
				},
			},
		},
		postcss: {
			options: {
				map: {
					inline: false,
					annotation: "./dist/styles",
				},
				processors: [
					require("pixrem")(),
					require("autoprefixer")({}),
				],
			},
			dist: {
				src: "./dist/styles/*.css",
			},
		},
		shell: {
			css2ts: {
				command: `node ./node_modules/css-to-ts/dist/cli.js --rootDir "./dist/styles/" --outDir "./src/styles/" --pattern "index.css" --varName "STYLING"`,
			},
		},
		"string-replace": {
			inline: {
				files: {
					"./src/styles/index.ts": "./src/styles/index.ts",
				},
				options: {
					replacements: [
						{
							pattern: /[\\]/ig,
							replacement: `\\\\`,
						},
					],
				},
			},
		},
	});
	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks("grunt-sass");
	grunt.loadNpmTasks("grunt-contrib-cssmin");
	grunt.loadNpmTasks("grunt-postcss");
	grunt.loadNpmTasks("grunt-string-replace");
	grunt.loadNpmTasks("grunt-css-to-js");
	grunt.registerTask("styles", ["sass", "postcss", "cssmin"]);
	grunt.registerTask("default", ["styles", "shell:css2ts", "string-replace", "ts"]);
};
