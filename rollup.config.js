// rollup.config.js
import * as fs from 'fs';
import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import autoPreprocess from 'svelte-preprocess'
import scss from 'rollup-plugin-scss'
import inlineSvg from 'rollup-plugin-inline-svg';
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const isProduction = process.env.buildTarget === "production";

export default {
  input: 'src/main.js',
  output: {
    file: 'public/app.js',
    format: 'iife'
  },
  plugins: [
    svelte({
      include: 'src/**/*.svelte',

      preprocess: autoPreprocess({ /* options */ }),

      // Extract CSS into a separate file (recommended).
      // See note below
      css: function (css) {
        // creates `main.css` and `main.css.map` — pass `false`
        // as the second argument if you don't want the sourcemap
        css.write('public/app.css', false);
      },
      
      preprocess: [
        autoPreprocess.scss({ 
            includePaths: ['src/style', 'node_modules']
        }),
      ],

      onwarn: (warning, handler) => {
        if (warning.code === 'a11y-distracting-elements') return;
        handler(warning);
      }
    }),
    resolve(),
    inlineSvg({
      removeTags: true,
      removingTags: ['title', 'desc', 'defs', 'style'],
      warnTags: [], 
      removeSVGTagAttrs: true,
      removingTagAttrs: ['height', 'width'],
      warnTagAttrs: []
    }),
    scss({
        failOnError: true,
        output: 'public/global.css'
    }),
    ...!isProduction ? [
      serve("public"),
      livereload()
    ] : []
  ]
}