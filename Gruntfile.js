var path = require('path'),
	async = require('async'),
	fs    = require('fs'),
    bower = require('bower');

module.exports = function(grunt) {

	grunt.initConfig({
		sass: {
			options: {
				sourceMap: true,
				outputStyle: 'compressed'
			},
			deploy: {
				files: {
					'deploy/css/style.css': 'frontend/css/style.scss'
				}
			},
			dev: {
				files: {
					'frontend/css/style.css': 'frontend/css/style.scss'
				}
			}
		},
		copy: {
			deploy: {
				files: [
					{ flatten: true, src: ['bower_components/requirejs/require.js'], dest: 'deploy/js/libs/require/require.js', filter: 'isFile'  },
					{ flatten: true, src: ['build/bootstrapper.js'], dest: 'deploy/js/bootstrapper.js', filter: 'isFile'  },
					{ flatten: true, src: ['frontend/locale.html'], dest: 'deploy/locale.html', filter: 'isFile'  },
					{ flatten: true, src: ['frontend/css/bootstrap.min.css'], dest: 'deploy/css/bootstrap.min.css', filter: 'isFile'  },
					{ flatten: true, src: ['frontend/css/jquery.sidr.dark.css'], dest: 'deploy/css/jquery.sidr.dark.css', filter: 'isFile'  }
				]
			},
			dev: {
				files: [
					{ flatten: true, src: ['bower_components/backbone/backbone.js'], dest: 'frontend/js/libs/backbone/backbone.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/requirejs/require.js'], dest: 'frontend/js/libs/require/require.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/requirejs-hbs/hbs.js'], dest: 'frontend/js/libs/requirejs-hbs/hbs.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/jquery/dist/jquery.js'], dest: 'frontend/js/libs/jquery/jquery.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/underscore/underscore.js'], dest: 'frontend/js/libs/underscore/underscore.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/handlebars/handlebars.js'], dest: 'frontend/js/libs/handlebars/handlebars.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/text/text.js'], dest: 'frontend/js/libs/text/text.js', filter: 'isFile' },
					{ flatten: true, src: ['bower_components/bootstrap/dist/js/bootstrap.js'], dest: 'frontend/js/libs/bootstrap/bootstrap.js', filter: 'isFile'  },
					{ flatten: true, src: ['bower_components/js-marker-clusterer/src/markerclusterer_compiled.js'], dest: 'frontend/js/libs/gmaps/marker-clusterer.js', filter: 'isFile'  }
				]
			}
		},
		requirejs: {
			deploy: {
				options: {
					baseUrl: "frontend/js",
					mainConfigFile: "frontend/js/bootstrapper.js",
					out: "build/bootstrapper.js",
					name: "bootstrapper",
					removeCombined: true,
					findNestedDependencies: true,
					optimize: 'uglify2',
				}
			}
		},
		nodemon: {
			deploy: {
				script: 'server/backend.js',
				options: {
					args: ['production'],
					nodeArgs: [],
					env: {
						PORT: '80'
					},
					delay: 1000
				}
			},
			dev: {
				script: 'server/backend.js',
				options: {
					args: [],
					nodeArgs: [],
					env: {
						PORT: '80'
					},
					delay: 1000
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-sass');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-nodemon');
	
	grunt.registerTask('ensure-installed', function() {
		var complete = this.async();
		
		if (!fs.existsSync(__dirname + "/bower_components")) {
			bower.commands.install().on('data', function(data) {
					process.stdout.write(data);
			}).on('error', function(data) {
					process.stderr.write(data);
			}).on('end', function (data) {
				complete();
				console.log("Bower install script executed");
			});
		} else {
			complete();
		}
	});	
	
	grunt.registerTask('server', 'Run backend server in developmenet mode', function() {
		grunt.task.run('nodemon:dev');
	});
	
	grunt.registerTask('server:production', 'Run backend server in production mode', function() {
		grunt.task.run('nodemon:deploy');
	});
	
	grunt.registerTask('deploy', 'Create production build', function() {
		grunt.task.run('ensure-installed');
		grunt.task.run('copy:dev');
		grunt.task.run('sass:deploy');
		grunt.task.run('requirejs:deploy');
		grunt.task.run('copy:deploy');
	});
	
	grunt.registerTask('deploy:server', 'Deploy production build and run server', function() {
		grunt.task.run('deploy');
		grunt.task.run('server:production');
	});
	
	grunt.registerTask('default', function() {
		grunt.task.run('ensure-installed');
		grunt.task.run('copy:dev');
	});
};
