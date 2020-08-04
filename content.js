/* Do best guess based on styleGuess, then show other style options to correct if wrong*/
/*Look up zip from lat/lon on map - otherwise (if that doesnt always exist) use ciyy zip lookup */
/*`https://www.kbb.com/${craigsModel.make}/${craigsModel.model}/${craigsModel.year}/${style}}/?category=${category}&condition=${condition-after-map}&intent=buy-used&pricetype=retail`*/

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
var bestStyleGuessFromCraigslistInfo;

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

    bestStyleGuessFromCraigslistInfo = cleanHtmlString(carNameComponents[3]);
    if(craigsModel.type!= null && craigsModel.type != undefined){
        bestStyleGuessFromCraigslistInfo += craigsModel.type;
    }
    
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
        // console.log(links);
    
        //get kbb links for categories
        kbbCarCategories = links.filter(function (item) {
            return item.includes(craigsModel.year) && item.includes("vehicleid");// && item.includes("category=");
        });
         console.log(kbbCarCategories);

        var styleProbabilities = new Array();

        kbbCarCategories.forEach(function (styleLink){
            var partsOfStr = styleLink.split('/');
            styleProbabilities.push({name: partsOfStr[6], percentSimilarity: similarity(partsOfStr[6], bestStyleGuessFromCraigslistInfo)} );
            });

            var styleProbabilities = styleProbabilities.sort(function (a, b) {
                return  a.percentSimilarity < b.percentSimilarity ? 1 : -1;
            })
            console.log(styleProbabilities);
            console.log("kbb style best guess: " + styleProbabilities[0].name);

            var bestGuessLink = kbbCarCategories.filter(function (item) {
                return item.split('/')[6] == styleProbabilities[0].name;
            });
            console.log(getParameterByName("vehicleid", bestGuessLink));
            var vehicleid = getParameterByName("vehicleid", bestGuessLink)
            //var bestGuessLink = `https://www.kbb.com/${craigsModel.make}/${craigsModel.model}/${craigsModel.year}/${styleProbabilities[0].name}/?intent=buy-used&mileage=${craigsModel.odometer}&pricetype=private-party&condition=${craigsModel.}}`;
            var bestGuessFullLink = `https://www.kbb.com/${craigsModel.make}/${craigsModel.model}/${craigsModel.year}/${styleProbabilities[0].name}/?vehicleid=${vehicleid}&intent=buy-used&mileage=${craigsModel.odometer}&pricetype=private-party`;

            GetKbbBestPrice(bestGuessFullLink);

       // GetKbbCarStyles(kbbCarCategories);
      });
}

function GetKbbBestPrice(kbbBestGuessUrl) {
    console.log("get value from: " + kbbBestGuessUrl);

    chrome.runtime.sendMessage({kbbPriceEndpoint: kbbBestGuessUrl}, function(response) {
        var kbbDOM = stringToHTMLDoc(response.result);
        console.log(kbbDOM);

        //var rangeBox = kbbDOM.getElementById("RangeBox");
        var gs = kbbDOM.getElementsByTagName('g');
        // Array.from(gs).forEach(function (item) {
        //     console.log(item.id);
        // })
        // var rangeBox = Array.from(gs).filter(function (item) {
        //     return item.id == "RangeBox";
        // });
        //console.log(rangeBox);
      });
}


// function GetKbbCarStyles(kbbCarCategoriesUrls) {
//     chrome.runtime.sendMessage({categoryUrls: kbbCarCategoriesUrls}, function(response) {
//         var resultHtmlStrings = Array.from(response.result);
//         var stylesLinks = [];

//          //convert html strings to doc objects
//         var kbbStyleDocs = resultHtmlStrings.map(function (item) {
//             return stringToHTMLDoc(item);
//         });

//         //get all style links 
//         kbbStyleDocs.forEach(function (doc){
//             var links = Array.from(doc.getElementsByTagName('a')).map(function (item) {
//                 return item.href;
//             });
//             console.log(links);

//             var kbbStyleLinks = links.filter(function (item) {
//                  return item.includes("kbb") && item.includes("options");
//             });
//             console.log(kbbStyleLinks);

//             kbbStyleLinks.forEach(function (link){
//                 stylesLinks.push(link);
//             });
            
//         });
//         console.log(stylesLinks);

//         var styleTypes = [];
//         stylesLinks.forEach(function (styleLink){
//             var partsOfStr = styleLink.split('/');
//             styleTypes.push(partsOfStr[6]);
//             });

//             console.log(styleTypes);
//       });
// }









//helper functions
function cleanHtmlString(input)
{
    if(input != null && input != undefined)
    {
        return input.replace(/<\/?[^>]+(>|$)/g, "");
    }
    return null;
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


//Levenshtein distance string similarity - https://codepad.co/snippet/javascript-calculating-similarity-between-two-strings
function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  }
  
  function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  //https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// function craigslistToKbbConditionMapper(clCondition)
// {
//         if(clCondition.includes("like new"))
//             return "Excellent Condition";

//             //craigs - excellent
//         // case "":
//         //     return "Very Goof Condition";
//         // case "":
//         //     return "Good Condition";
//         // case "":
//         //     return "Fair Condition";
// }