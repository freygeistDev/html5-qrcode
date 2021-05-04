# html5-qrcode without any external frameworks with external css

## Include the js library in your project
```html
<script src="https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js"></script>
```

## Include the css file in your project
```html
<link href="/style.css" rel="stylesheet" type="text/css">
```

## Add a placeholder in html
```html
<div id="qr-reader" style="width:500px"></div>
<div id="qr-reader-results"></div>
```

## Init in javascript

Disable Inline-CSS with Option: `inlineCSS: false`

```js
var resultContainer = document.getElementById('qr-reader-results');
var lastResult, countResults = 0;

function onScanSuccess(qrCodeMessage) {
    if (qrCodeMessage !== lastResult) {
        ++countResults;
        lastResult = qrCodeMessage;
        resultContainer.innerHTML 
            += `<div>[${countResults}] - ${qrCodeMessage}</div>`;
    }
}

var html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", { fps: 10, qrbox: 250, inlineCSS: false });
html5QrcodeScanner.render(onScanSuccess);
```
