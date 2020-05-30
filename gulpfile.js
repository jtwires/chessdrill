const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const colors = require('ansi-colors');
const logger = require('fancy-log');
const watchify = require('watchify');
const browserify = require('browserify');
const terser = require('gulp-terser');
const tsify = require('tsify');
const concat = require('gulp-concat');
const uglifycss = require('gulp-uglifycss');

const destination = () => gulp.dest('./dist');

const prod = () => {
  const opts = {
    standalone: 'Chessdrill',
    entries: ['src/index.js'],
    debug: false
  };
  return browserify(opts)
    .plugin(tsify)
    .bundle()
    .pipe(source('chessdrill.js'))
    //.pipe(buffer())
    //.pipe(terser({safari10: true}))
    .pipe(destination());
};

const dev = () => {
  const opts = {
    standalone: 'ChessdrillApp',
    entries: ['src/app.ts'],
    debug: true
  };
  return browserify(opts)
    .plugin(tsify)
    .bundle()
    .pipe(source('chessdrill-app.js'))
    .pipe(destination());
};

const watch = () => {
  const opts = {
    standalone: 'ChessdrillApp',
    entries: ['src/app.ts'],
    debug: true
  };

  const bundle = () => bundler
        .bundle()
        .on('error', error => logger.error(colors.red(error.message)))
        .pipe(source('chessdrill-app.js'))
        .pipe(destination());

  const bundler = watchify(
    browserify(Object.assign({}, watchify.args, opts))
      .plugin(tsify)
  ).on('update', bundle).on('log', logger.info);

  return bundle();
};

const css = () => {
  return gulp
    .src('assets/chess*.css')
    .pipe(uglifycss())
    .pipe(concat('chessdrill.css'))
    .pipe(gulp.dest('./dist/assets'));
};

const theme = () => {
  return gulp
    .src('assets/theme.css')
    .pipe(gulp.dest('./dist/assets'));
};

const images = () => {
  return gulp
    .src('assets/images/**/*')
    .pipe(gulp.dest('./dist/assets/images'));
};

gulp.task('dev', dev);
gulp.task('watch', watch);

gulp.task('prod', prod);
gulp.task('css', css);
gulp.task('theme', theme);
gulp.task('images', images);

gulp.task('default', gulp.parallel(['prod', 'css', 'theme', 'images']));
