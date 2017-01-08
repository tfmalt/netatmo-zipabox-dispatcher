
const watch     = require('gulp-watch');
const jshint    = require('gulp-jshint');
const gulp      = require('gulp');
const pkg       = require('./package');
const jshintCfg = pkg.jshintConfig;

jshintCfg.lookup = false;

gulp.task('default', () => {
    // code goes here
});

gulp.task('lint', () => {
    return gulp.watch([
        './*.js',
        './lib/*.js' 
    ], () => {
        gulp.src([
            './lib/*.js',
            './*.js'
        ])
            .pipe(jshint(jshintCfg))
            .pipe(jshint.reporter('unix'));
    });
});

