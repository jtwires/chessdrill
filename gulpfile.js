const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const colors = require('ansi-colors');
const logger = require('fancy-log');
const watchify = require('watchify');
const browserify = require('browserify');
const terser = require('gulp-terser');
const tsify = require('tsify');

const destination = () => gulp.dest('./dist');

const prod = () => {
  const opts = {
    standalone: 'Chessdrill',
    entries: ['src/chessdrill.ts'],
    debug: false
  };
  return browserify(opts)
    .plugin(tsify)
    .bundle()
    .pipe(source('chessdrill.min.js'))
    .pipe(buffer())
    .pipe(terser({safari10: true}))
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

gulp.task('dev', dev);
gulp.task('prod', prod);
gulp.task('default', watch);
