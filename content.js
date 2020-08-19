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
var kbbCarCategories = new Array();
var bestStyleGuessFromCraigslistInfo;

GetCraigslistData();
GetKbbCarDetails(categoriesListUrl, null);

function GetCraigslistData() {
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
  if (craigsModel.type != null && craigsModel.type != undefined) {
    bestStyleGuessFromCraigslistInfo += craigsModel.type;
  }

  console.log(craigsModel);
}

function GetKbbCarDetails(kbbCategoriesUrl) {
  chrome.runtime.sendMessage({ url: kbbCategoriesUrl }, function (response) {
    var kbbDOM = stringToHTMLDoc(response.result); //convert html string to doc object

    var links = Array.from(kbbDOM.getElementsByTagName('a')).map(function (item) {  //get all links from doc 
      return item.href;
    });

    var categoryLinks = links.filter(function (item) {
      return item.includes(craigsModel.year) && item.includes(craigsModel.year) && item.includes("category=");
    });

    chrome.runtime.sendMessage({ categoryUrls: categoryLinks }, function (response) {
      var resultHtmlStrings = Array.from(response.result);

      var kbbStyleDocs = resultHtmlStrings.map(function (item) {  //convert html strings to doc objects
        return stringToHTMLDoc(item);
      });

      //get all style links 
      kbbStyleDocs.forEach(function (doc) {
        var links = Array.from(doc.getElementsByTagName('a')).map(function (item) {
          return item.href;
        });

        var kbbStyleLinks = links.filter(function (item) {
          return item.includes("kbb") && item.includes("options");
        });

        kbbStyleLinks.forEach(function (link) {
          kbbCarCategories.push(link);
        });
      });

        var styleProbabilities = GetStyleProbabilities(kbbCarCategories);

         var styleUrl = kbbCarCategories.filter(function (item) {
          return item.split('/')[6] == styleProbabilities[0].name;
        });

      
      var vehicleid = getParameterByName("vehicleid", styleUrl)
      var kbbServiceUrl = `https://upa.syndication.kbb.com/usedcar/privateparty/buy/?apikey=2c190408-b9cf-402e-a312-df4cc0e0d0f0&zipcode=97086&vehicleid=${vehicleid}&pricetype=privateparty&condition=good&format=json`;
      chrome.runtime.sendMessage({ kbbJsonApiService: kbbServiceUrl }, function (response) {
        var jsonResultObj = JSON.parse(response.result);
        console.log(jsonResultObj);

        var price = jsonResultObj.Data.APIData.vehicle.values[2].value;
        console.log(price);
        InjectIntoPage(jsonResultObj.Data.APIData.vehicle.values, kbbCarCategories);
      });

    });
  });
}

function GetKbbCarDetailsForKnownType(knownType) {

  var styleUrl = kbbCarCategories.filter(function (item) {
    return item.split('/')[6] == knownType;
  });

  var vehicleid = getParameterByName("vehicleid", styleUrl)
      var kbbServiceUrl = `https://upa.syndication.kbb.com/usedcar/privateparty/buy/?apikey=2c190408-b9cf-402e-a312-df4cc0e0d0f0&zipcode=97086&vehicleid=${vehicleid}&pricetype=privateparty&condition=good&format=json`;
      chrome.runtime.sendMessage({ kbbJsonApiService: kbbServiceUrl }, function (response) {
        var jsonResultObj = JSON.parse(response.result);
        console.log(jsonResultObj);

        var price = jsonResultObj.Data.APIData.vehicle.values[2].value;
        console.log(price);
        InjectIntoPage(jsonResultObj.Data.APIData.vehicle.values, kbbCarCategories);
      });
}


function GetBestGuessLink(bestKbbBaseUrl, bestguessCategory) {
  var vehicleid = getParameterByName("vehicleid", bestKbbBaseUrl)
  var bestGuessFullLink = `https://www.kbb.com/${craigsModel.make}/${craigsModel.model}/${craigsModel.year}/${bestguessCategory}/?vehicleid=${vehicleid}&intent=buy-used&mileage=${craigsModel.odometer}&pricetype=private-party`;
  return bestGuessFullLink;
}

function GetStyleProbabilities(KbbCategories) {
  var styleProbabilities = new Array();

  KbbCategories.forEach(function (styleLink) {
    var partsOfStr = styleLink.split('/');
    styleProbabilities.push({ name: partsOfStr[6], percentSimilarity: similarity(partsOfStr[6], bestStyleGuessFromCraigslistInfo) });
  });

  var styleProbabilities = styleProbabilities.sort(function (a, b) {
    return a.percentSimilarity < b.percentSimilarity ? 1 : -1;
  })
  console.log(styleProbabilities);
  console.log("kbb style best guess: " + styleProbabilities[0].name);

  return styleProbabilities;
}

function InjectIntoPage(prices, categoryUrls) {
  var low = prices[2].low;
  var high = prices[2].high;
  var value = prices[2].value;

  var categories = categoryUrls.map(function (item) {
    return item.split('/')[6];
  });

  //outer div wrapper
  var kbbOuterDiv = document.createElement("div");
  kbbOuterDiv.style.padding = '10px';
  kbbOuterDiv.style.border = 'thin solid black';
  kbbOuterDiv.style.borderRadius = '10px';

  //inner div
  var innerDiv = document.createElement("div");

  var titleDiv = document.createElement("div");
  titleDiv.style.textAlign = "center";
  titleDiv.innerHTML = "<strong>Kelley Blue Book Values</strong>";

  //prices section
  var pricesP = document.createElement("p");
  pricesP.className = 'attrgroup';
  var valueSpan = document.createElement("span");
  valueSpan.innerHTML = `Value: <strong>$${value}</strong><br>`;
  var rangeSpan = document.createElement("span");
  rangeSpan.innerHTML = `Range: <strong>$${low} - $${high}</strong>`;
  pricesP.appendChild(valueSpan);
  pricesP.appendChild(rangeSpan);


  var typeP = document.createElement("p");
  typeP.innerHTML = "<strong>Type</strong>";

  var categorySelector = document.createElement("select");
  categories.forEach(function (item) {
    var option = document.createElement("option");
    option.innerHTML = convertStyleToDisplayNames(item);
    option.value = item;
    categorySelector.appendChild(option);
  });
  categorySelector.id = "categorySelector";
  categorySelector.addEventListener('change', carTypeSelected);


  innerDiv.appendChild(titleDiv);
  innerDiv.appendChild(pricesP);
  innerDiv.appendChild(typeP);
  innerDiv.appendChild(categorySelector);

  kbbOuterDiv.appendChild(innerDiv);

  document.getElementsByClassName("mapAndAttrs")[0].appendChild(kbbOuterDiv);
}


function carTypeSelected() {
  var categorySelector = document.getElementById("categorySelector");
  GetKbbCarDetailsForKnownType(categorySelector.value);
}

//helper functions
function cleanHtmlString(input) {
  if (input != null && input != undefined) {
    return input.replace(/<\/?[^>]+(>|$)/g, "");
  }
  return null;
}

var stringToHTMLDoc = function (str) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(str, 'text/html');
  return doc.body;
};

var getQueryString = function (field, url) {
  var href = url ? url : window.location.href;
  var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
  var string = reg.exec(href);
  return string ? string[1] : null;
};


function convertStyleToDisplayNames(style) {
  style = style.replace(/-/g, ' ');
  style = style.toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(' ');
  return style;
}

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
//         //     return "Very Good Condition";
//         // case "":
//         //     return "Good Condition";
//         // case "":
//         //     return "Fair Condition";
// }