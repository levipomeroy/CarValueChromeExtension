chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        //add logic to handle multiple message types
        sendResponse({ result: GetKBBHtml(request.url) });
       // sendResponse({ result: request.url });
    });

function GetKBBHtml(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false); // false for synchronous request
    xmlHttp.send();
    return xmlHttp.responseText;
}