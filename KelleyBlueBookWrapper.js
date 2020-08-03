chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
       if(request.url != null && request.url != undefined) {
           sendResponse({ result: GetKBBHtml(request.url) });
       }
       else if(request.categoryUrls != null && request.categoryUrls != undefined) {
           var urlsArray = Array.from(request.categoryUrls);
           var htmlStrings = [];
           urlsArray.forEach(function (item){
            htmlStrings.push(GetKBBHtml(item));
           });
           sendResponse({result: htmlStrings});
       }
    });

function GetKBBHtml(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false); // false for synchronous request
    xmlHttp.send();
    return xmlHttp.responseText;
}