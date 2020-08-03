/* Do best guess based on styleGuess, then show other style options to correct if wrong*/
/*Look up zip from lat/lon on map - otherwise (if that doesnt always exist) use ciyy zip lookup */

var craigsModel = {
    year: "",
    make: "", 
    model: "",
    odometer: "",
    condition: "",
    type: "",
    color: "",
    cylinders: "",
    drive: ""
}
var categoriesListUrl;
var kbbCarCategories;

GetCraigslistData();
GetKbbCarCategories(categoriesListUrl);

function GetCraigslistData()
{
    var attrgroupElements = document.getElementsByClassName("mapAndAttrs")[0].getElementsByClassName("attrgroup");
    var carNameComponents = attrgroupElements[0].getElementsByTagName("span")[0].innerHTML.split(" ");
    var attrs = attrgroupElements[1].getElementsByTagName("span");
    let attrsArray = Array.from(attrs);
    
    craigsModel.year = cleanHtmlString(carNameComponents[0]);
    craigsModel.make = cleanHtmlString(carNameComponents[1]);
    craigsModel.model = cleanHtmlString(carNameComponents[2]);
    var styleGuess = carNameComponents[3];
    
    categoriesListUrl = `https://www.kbb.com/${craigsModel.make}/${craigsModel.model}/${craigsModel.year}/styles/?intent=buy-used/`;
    console.log(categoriesListUrl);
    
    var odometerElement = attrsArray.find(x => x.innerHTML.includes("odometer"));
    craigsModel.odometer = odometerElement != null ? cleanHtmlString(odometerElement.innerHTML).match(/\d+/)[0] : "unknown";
    
    var conditionElement = attrsArray.find(x => x.innerHTML.includes("condition"));
    craigsModel.condition = conditionElement != null ? cleanHtmlString(conditionElement.innerHTML) : "unknown";
    
    var typeElement = attrsArray.find(x => x.innerHTML.includes("type"));
    craigsModel.type = typeElement != null ? cleanHtmlString(typeElement.innerHTML) : "unknown";
    
    var colorElement = attrsArray.find(x => x.innerHTML.includes("paint color"));
    craigsModel.color = colorElement != null ? cleanHtmlString(colorElement.innerHTML) : "unknown";
    
    var cylindersElement = attrsArray.find(x => x.innerHTML.includes("cylinders"));
    craigsModel.cylinders = cylindersElement != null ? cleanHtmlString(cylindersElement.innerHTML).match(/\d+/)[0] : "unknown";
    
    var driveElement = attrsArray.find(x => x.innerHTML.includes("drive"));
    craigsModel.drive = driveElement != null ? cleanHtmlString(driveElement.innerHTML) : "unknown";
    
    console.log(craigsModel);
}

function GetKbbCarCategories(kbbCategoriesUrl){
    chrome.runtime.sendMessage({url: kbbCategoriesUrl}, function(response) {
        //convert html string to doc object
        var kbbDOM = stringToHTMLDoc(response.result);
    
        //get all links from doc 
        var links = Array.from(kbbDOM.getElementsByTagName('a')).map(function (item) {
            return item.href;
        });
    
        //get kbb links for categories
        kbbCarCategories = links.filter(function (item) {
            return item.includes("kbb") && item.includes("category=");
        });
        console.log(kbbCarCategories);
    
        // carCategories.forEach(function (item){
        //     console.log(getQueryString('category', item));
        // });
        GetKbbCarStyles(kbbCarCategories);
      });
}

function GetKbbCarStyles(kbbCarCategoriesUrls) {
    chrome.runtime.sendMessage({categoryUrls: kbbCarCategoriesUrls}, function(response) {
        var resultHtmlStrings = Array.from(response.result);
        var styles = [];

        var kbbStyleDocs = resultHtmlStrings.map(function (item) {
            return stringToHTMLDoc(item);
        });

        kbbStyleDocs.forEach(function (doc){
            var links = Array.from(doc.getElementsByTagName('a')).map(function (item) {
                return item.href;
            });

            var kbbStyleLinks = links.filter(function (item) {
                return item.includes("kbb") && item.includes("options");
            });

            kbbStyleLinks.forEach(function (link){
                styles.push(link);
            });
            
        });
        console.log(styles);
      });
}







//helper functions
function cleanHtmlString(input)
{
    return input.replace(/<\/?[^>]+(>|$)/g, "");
}

var stringToHTMLDoc = function (str) {
	var parser = new DOMParser();
	var doc = parser.parseFromString(str, 'text/html');
	return doc.body;
};

var getQueryString = function ( field, url ) {
	var href = url ? url : window.location.href;
	var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
	var string = reg.exec(href);
	return string ? string[1] : null;
};