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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');

    grunt.registerTask('dev',[
        'watch'
    ]);

    grunt.registerTask('pro',[
        'concat'
    ]);
};