/*
 * @Author: Clloz
 * @Date: 2020-07-26 02:26:43
 * @LastEditTime: 2020-08-01 03:23:08
 * @LastEditors: Clloz
 * @Description: parse html, build DOM tree
 * @FilePath: /toy-browser/parser.js
 * @博观而约取，厚积而薄发，日拱一卒，日进一寸，学不可以已。
 */
const css = require('css');
const EOF = Symbol('EOF'); //end of file
const layout = require('./layout');

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;
let stack = [{ type: 'document', children: [] }];

//处理style标签中的content
let rules = [];
function addCSSRules(text) {
    let ast = css.parse(text);
    //console.log(JSON.stringify(ast, null, '    '));
    rules.push(...ast.stylesheet.rules);
}

//复合选择器 div#myid .class1.class2
function match(element, selector) {
    if (!selector || !element.attributes) return false;

    if (selector.charAt(0) === '#') {
        let attr = element.attributes.filter(attr => attr.name === 'id')[0];
        if (attr && attr.value === selector.replace('#', '')) return true;
    } else if (selector.charAt(0) === '.') {
        let attr = element.attributes.filter(attr => attr.name === 'class')[0];
        if (attr && attr.value === selector.replace('.', '')) return true;
    } else {
        if (element.tagName === selector) {
            return true;
        }
    }
    return false;
}

function re_match(element, selector) {
    if (!selector || !element.attributes) return false;

    //初始化一个对象用来存放selector中的不同简单选择器
    let selectors = {
        tagName: '',
        id: '',
        class: [],
    };

    //将element中的简单选择器也存入对象，用来比较
    let id = element.attributes.filter(attr => attr.name === 'id')[0];
    let classStr = element.attributes.filter(attr => attr.name === 'class')[0];
    let element_attr = {
        tagName: element.tagName,
        id: id || '',
        class: (classStr && classStr.value) || '',
    };

    let className = '',
        id_char = false,
        class_char = false;

    //对selector进行处理，将复杂选择器拆分成简单选择器以便比较
    for (let c of selector) {
        if (c === '#') {
            if (className !== '') {
                selectors.class.push(className);
                className = '';
            }
            id_char = true;
            class_char = false;
        } else if (c === '.') {
            if (className !== '') {
                selectors.class.push(className);
                className = '';
            }
            class_char = true;
            id_char = false;
        } else if (id_char === true) {
            selectors.id += c;
        } else if (class_char === true) {
            className += c;
        } else {
            selectors.tagName += c;
        }
    }
    if (className !== '') selectors.class.push(className);
    selectors.class = selectors.class.join(' ');

    //用for in循环比较，有一个不同则返回false，否则返回true
    for (let key in selectors) {
        if (element_attr[key] !== selectors[key]) {
            return false;
        }
    }
    return true;
}

function specificity(selector) {
    let p = [0, 0, 0, 0];
    let selectorParts = selector.split(' ');
    for (let part of selectorParts) {
        if (part.charAt(0) === '#') {
            p[1] += 1;
        } else if (part.charAt(0) === '.') {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    }
    return p;
}

function compare(sp1, sp2) {
    if (sp1[0] === sp2[0]) return sp1[0] - sp2[0];
    if (sp1[1] === sp2[1]) return sp1[1] - sp2[1];
    if (sp1[2] === sp2[2]) return sp1[2] - sp2[2];
    return sp1[3] - sp2[3];
}

function computeCSS(element) {
    let elements = stack.slice().reverse();
    if (!element.computedStyle) element.computedStyle = {};

    for (let rule of rules) {
        let selectorParts = rule.selectors[0].split(' ').reverse();

        console.log(match(element, selectorParts[0]));
        if (!match(element, selectorParts[0])) continue;

        let j = 1,
            matched = false;

        for (let i = 0; i < elements.length; i++) {
            if (match(elements[i], selectorParts[j])) j++;
        }
        if (j >= selectorParts.length) matched = true;

        if (matched) {
            console.log('matched');
            let sp = specificity(rule.selectors[0]);
            let computedStyle = element.computedStyle;

            for (let declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) computedStyle[declaration.property] = {};
                computedStyle[declaration.property].value = declaration.value;

                if (!computedStyle[declaration.property].specificity) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                }
            }
            console.log(element.computedStyle);
        }
    }
}

function emit(token) {
    //console.log(token);
    let top = stack[stack.length - 1];

    if (token.type === 'startTag') {
        let element = {
            type: 'element',
            tagName: token.tagName,
            children: [],
            attributes: [],
        };

        for (let p in token) {
            if (p != 'type' && p != 'tagName') {
                element.attributes.push({
                    name: p,
                    value: token[p],
                });
            }
        }

        computeCSS(element);

        top.children.push(element);
        //element.parent = top;

        if (!token.isSelfClosing) {
            stack.push(element);
        }
        currentTextNode = null;
    } else if (token.type === 'endTag') {
        if (top.tagName != token.tagName) {
            throw new Error("Tag start and end don't match");
        } else {
            //style标签处理
            if (top.tagName === 'style') {
                addCSSRules(top.children[0].content);
            }
            layout(top);
            stack.pop();
        }
        currentTextNode = null;
    } else if (token.type === 'text') {
        if (currentTextNode === null) {
            currentTextNode = {
                type: 'text',
                content: '',
            };
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
}

function data(c) {
    if (c === '<') {
        return tagOpen;
    } else if (c === EOF) {
        emit({
            type: 'EOF',
        });
        return;
    } else {
        emit({
            type: 'text',
            content: c,
        });
        return data;
    }
}

//tag parse
function tagOpen(c) {
    if (c === '/') {
        return endTagOpen;
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: '',
        };
        return tagName(c);
    } else {
        return;
    }
}

function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: '',
        };
        return tagName(c);
    } else if (c === '>') {
    } else if (c === EOF) {
    } else {
    }
}

function tagName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c.match(/^[a-zA-z]$/)) {
        currentToken.tagName += c; //.toLowerCase()
        return tagName;
    } else if (c === '>') {
        emit(currentToken);
        return data;
    } else {
        return tagName;
    }
}

function selfClosingStartTag(c) {
    if (c === '>') {
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    } else if (c === EOF) {
    } else {
    }
}

//attribute parse
function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName;
    } else if (c === '>' || c === '/' || c === EOF) {
        return afterAttributeName(c);
    } else if (c === '=') {
        return attributeName;
    } else {
        currentAttribute = {
            name: '',
            value: '',
        };
        return attributeName(c);
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
        return afterAttributeName(c);
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '\u0000') {
    } else if (c === '"' || c === "'" || c === '<') {
    } else {
        currentAttribute.name += c;
        return attributeName;
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\b\f ]$/)) {
        return afterAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '=') {
        return beforeAttributeValue;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === EOF) {
        emit({
            type: EOF,
        });
    } else {
        currentToken[currentAttribute.name] = currentAttribute.value;
        currentAttribute = {
            name: '',
            value: '',
        };
        return attributeName(c);
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
        return beforeAttributeValue;
    } else if (c === '"') {
        return doubleQoutedAttributeValue;
    } else if (c === "'") {
        return singleQuotedAttributeValue;
    } else if (c === '>') {
        // return data; 此处为什么注释掉？
    } else {
        return unQuotedAttributeValue;
    }
}

function doubleQoutedAttributeValue(c) {
    if (c === '"') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === '\u0000') {
    } else if (c === EOF) {
        emit({
            type: EOF,
        });
    } else {
        currentAttribute.value += c;
        return doubleQoutedAttributeValue;
    }
}

function singleQuotedAttributeValue(c) {
    if (c === "'") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if (c === '\u0000') {
    } else if (c === EOF) {
        emit({
            type: EOF,
        });
    } else if (c === '&') {
        console.log(c);
    } else {
        currentAttribute.value += c;
        return singleQuotedAttributeValue;
    }
}

function unQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttributeName;
    } else if (c === '/') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === EOF) {
    } else if (c === '\u0000') {
    } else if (c === '"' || c === "'" || c === '>' || c === '`') {
    } else {
        currentAttribute.value += c;
        return unQuotedAttributeValue;
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\f\n ]$/)) {
        return beforeAttributeName;
    } else if (c === '/') {
        return selfClosingStartTag;
    } else if (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if (c === EOF) {
        emit({
            type: EOF,
        });
    } else {
        return beforeAttributeName(c);
    }
}

module.exports.parseHTML = function parseHTML(html) {
    //console.log(html);
    let state = data;
    for (let c of html) {
        state = state(c);
    }
    state = state(EOF);
    //console.log(stack[0]);
    return stack[0];
};
