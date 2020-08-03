/*
 * @Author: Clloz
 * @Date: 2020-07-25 12:36:08
 * @LastEditTime: 2020-08-01 14:42:55
 * @LastEditors: Clloz
 * @Description: toy-browser server
 * @FilePath: /toy-browser/server.js
 * @博观而约取，厚积而薄发，日拱一卒，日进一寸，学不可以已。
 */

const http = require('http');

const server = http.createServer((req, res) => {
    /**
     * @description: receive request from client, response a mock html.
     * @param {type}
     * @return:
     */
    console.log('request received');
    console.log(req.headers);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Name', 'Clloz');
    res.writeHead('200', { 'Content-Type': 'text/plain' });
    res.end(
        `<html name=clloz>
<head>
    <style>
        #container {
            width: 500px;
            height: 300px;
            display: flex;
            background-color: rgb(255,255,255);
        }
        #container #myid {
            width: 200px;
            height: 100px;
            background-color: rgb(255,0,0);
        }
        #container .c1 {
            flex: 1;
            background-color: rgb(0,255,0);
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="myid"></div>
        <div class="c1"></div>
    </div>
</body>
</html>`
    );
});

server.listen(8088);

console.log('Server started');
