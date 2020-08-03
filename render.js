/*
 * @Author: Clloz
 * @Date: 2020-08-01 11:47:39
 * @LastEditTime: 2020-08-02 18:17:43
 * @LastEditors: Clloz
 * @Description:render viewport
 * @FilePath: /toy-browser/render.js
 * @博观而约取，厚积而薄发，日拱一卒，日进一寸，学不可以已。
 */
const images = require('images');

function render(viewport, element) {
    if (element.style) {
        console.log(element.style);
        let img = images(element.style.width, element.style.height);
        if (element.style['background-color']) {
            let color = element.style['background-color'] || 'rgb(0,0,0)';
            color.match(/rgb\((\d+),\s?(\d+),\s?(\d+)\)/);

            //console.log(RegExp.$1, RegExp.$2, RegExp.$3);
            img.fill(Number(RegExp.$1), Number(RegExp.$2), Number(RegExp.$3));
            viewport.draw(img, element.style.left || 0, element.style.top || 0);
        }
    }

    if (element.children) {
        for (let child of element.children) {
            render(viewport, child);
        }
    }
}
module.exports = render;
