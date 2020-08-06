let projectFolder = require('path').basename(__dirname);
let sourceFolder = '#src';
let fs = require('fs');

let path = {
    build: {
        html: projectFolder + "/",
        css: projectFolder + '/css/',
        js: projectFolder + '/js/',
        img: projectFolder + '/img/',
        fonts: projectFolder + '/fonts/',
    },
    src: {
        html: [sourceFolder + "/*.html", '!' + sourceFolder + "/_*.html"],  //исключает из сборки файлы, начинающие с _ (файлы-части index.html)
        css: [sourceFolder + '/sass/style.sass', sourceFolder + '/css/normalize.css'],
        js: [sourceFolder + '/js/*.js', '!' + sourceFolder + '/js/jq*.min.js'],
        img: sourceFolder + '/img/**/*.{jpg,png,gif,ico,webp,svg}',
        fonts: sourceFolder + '/fonts/*.ttf',
    },
    watch: {
        html: sourceFolder + "/**/*.html",
        css: sourceFolder + '/sass/**/*.sass',
        js: sourceFolder + '/js/**/*.js',
        img: sourceFolder + '/img/**/*.{jpg,png,gif,ico,webp,svg}',
    },
    clean: './' + projectFolder + '/',
}

let { src, dest } = require('gulp'),
    gulp = require('gulp'),
    browsersync = require('browser-sync').create(),
    fileinclude = require('gulp-file-include'),
    del = require('del'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    groupmedia = require('gulp-group-css-media-queries'),
    cleancss = require('gulp-clean-css'),
    uglyfies = require('gulp-uglify-es').default,
    rename = require('gulp-rename'),
    imagemin = require('gulp-imagemin'),
    webp = require('gulp-webp'),
    webphtml = require('gulp-webp-html'),
    webpcss = require('gulp-webpcss'),   //конвертер классов для замены графичкеских форматов на webp в css
    svgSprite = require('gulp-svg-sprite'),
    fonter = require('gulp-fonter'),
    ttf2woff = require('gulp-ttf2woff'),  //убран конвертер шрифтов из ttf в woff
    ttf2woff2 = require('gulp-ttf2woff2');


function browserSync(params) {
    browsersync.init({
        server: {
            baseDir: path.clean,
        },
        port: 3000,
        notify: false,
    })
}

function html() {
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream());
}

function css() {
    return src(path.src.css)
        .pipe(sass({
            outputStyle: 'expanded',
        }))
        .pipe(
            groupmedia()
        )
        .pipe(
            autoprefixer({
                overrideBrowserlist: ['last 5 versions'],
                cascade: true,
            })
        )
        .pipe(webpcss({ webpClass: '.webp', noWebpClass: '.no-webp' }))
        .pipe(dest(path.build.css))
        .pipe(cleancss())
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(dest(path.build.css))
        .pipe(browsersync.stream());
}

function js() {
    return src(path.src.js)
        .pipe(fileinclude())
        .pipe(dest(path.build.js))
        .pipe(uglyfies())
        .pipe(rename({
            extname: '.min.js'
        }))
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream());
}

function imgs() {
    return src(path.src.img)
        .pipe(webp({
            quality: 70
        }))
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe(
            imagemin({
                progressive: true,
                svgoPlugins: [{ removeViewBox: false }],
                interlaced: true,
                optimizationLevel: 3, //0 to 7
            })
        )
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream());
}

function fonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts));
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts));
}

/**
 * Конвертация шрифтов otf в ttf. Запуск командой gulp otf2ttf
 */
gulp.task('otf2ttf', function () {
    return src([sourceFolder + '/fonts/*.otf'])
        .pipe(fonter({
            formats: ['ttf']
        }))
        .pipe(dest(sourceFolder + '/fonts/'));
})

/**
 * Сборка файлов svg  в спрайт файл. Запуск командой gulp svgSprite
 */
gulp.task('svgSprite', function () {
    return gulp.src([sourceFolder + '/iconsprite/*.svg'])
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: '../icons/icons.svg',  //sprite file name
                }
            }
        }))
        .pipe(dest(path.build.img))
})

/* JS-ФУНКЦИЯ ЗАПИСИ ИНФОРМАЦИИ В FONTS.SASS*/
function fontsStyle(params) {
    let file_content = fs.readFileSync(sourceFolder + '/sass/fonts.sass');
    if (file_content == '') {
        fs.writeFile(sourceFolder + '/sass/fonts.sass', '', callback);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(sourceFolder + '/sass/fonts.sass', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', callback);
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}

/* Функция  callback для автоматического подключения шрифтов */
function callback(params) {
}

function watchFiles(params) {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], imgs);
}

function clean(param) {
    return del(path.clean);
}

let build = gulp.series(clean, gulp.parallel(js, css, html, imgs, fonts), fontsStyle);
/* let build = gulp.series(clean, gulp.parallel(js, css, html, imgs)); */
let watch = gulp.parallel(build, watchFiles, browserSync);



exports.html = html;
exports.css = css;
exports.js = js;
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.imgs = imgs;
exports.build = build;
exports.watch = watch;
exports.default = watch;