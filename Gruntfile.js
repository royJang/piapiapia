module.exports = function (grunt){

    grunt.initConfig({
        watch : {
            homePage : {
                files : ['public/css/css.less'],
                tasks : ['less:homePage']
            }
        },
        less : {
            homePage : {
                files : {
                    "public/css/css.css" : "public/css/css.less"
                }
            }
        },
        nodewebkit: {
            options: {
                platforms: ['osx64','win64'],
                buildDir: './webkitbuilds', // Where the build version of my node-webkit app is saved
                credits: './public/Credits.html',
                macIcns : './icon.icns'
            },
            src: ['./public/**/*'] // Your node-webkit app
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-node-webkit-builder');

    grunt.registerTask('dev',[
        'watch'
    ]);

    grunt.registerTask('pro',[
        'nodewebkit'
    ]);
};