// ///////////////////////////////////////////////////////////////////////////////////////
// Nanopaint (C) 2024 Mukunda Johnson (me@mukunda.com)
// Distributed under the MIT license. See LICENSE.txt for details.
// ///////////////////////////////////////////////////////////////////////////////////////
import express from "express";
import fs from "fs";
import * as url from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
console.log("test-server dirname", __dirname);

const app = express();
const port = 80;

// Serve the dist folder.
app.use(express.static('dist'));

// Example reverse proxy configuration, to forward requests to a backend.
app.use('/api', createProxyMiddleware({
   target: 'http://localhost:1452',
   changeOrigin: true,
}));

// For files not found, serve a 404 page.
app.use(function(req, res, next) {
    // If ther is a 404 html file, serve that.
    if (fs.existsSync(__dirname + "/dist/404.html")) {
        res.status(404).sendFile(__dirname + "/dist/404.html");
        return;
    }
    res.status(404).send("404 Not Found");
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`);
});
