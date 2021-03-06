chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
       if(request.url != null && request.url != undefined) {
           sendResponse({ result: GetKBBHtml(request.url) });
       }
       else if(request.categoryUrls != null && request.categoryUrls != undefined) {
        doSomethingWith(request).then(sendResponse);
        return true;
        //    var urlsArray = Array.from(request.categoryUrls);
        //    var htmlStrings = [];
        //    urlsArray.forEach(function (item){
        //     htmlStrings.push(GetKBBHtml(item));
        //    });
        //    sendResponse({result: htmlStrings});
       }
       else if(request.kbbPriceEndpoint != null && request.kbbPriceEndpoint != undefined){
        sendResponse({ result: GetKBBHtml(request.kbbPriceEndpoint) });
       }
       else if(request.kbbJsonApiService != null && request.kbbJsonApiService !=undefined){
        sendResponse({ result: GetKBBHtml(request.kbbJsonApiService) });
       }
    });

function GetKBBHtml(url) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false); // false for synchronous request
    xmlHttp.send();
    return xmlHttp.responseText;
}

async function doSomethingWith(request) {
    var urlsArray = Array.from(request.categoryUrls);
    var htmlStrings = [];
    urlsArray.forEach(function (item){
     htmlStrings.push(GetKBBHtml(item));
    });
    return {result: htmlStrings};
  }