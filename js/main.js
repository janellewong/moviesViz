// Global filters
let data, data_filtered, geoData, newData;

let BudgetFilterValues = {
  min: 10,
  max: 356000000
};

// ID of movies selected in heatmap
let selectedMovies = new Set();

// certificates selected from barchart as string
let selectedCertificates = new Set();

// countries selected from geomap as string
let selectedCountries = new Set();

const dispatcher = d3.dispatch(
    'barchartFiltersAllViz',
    'heatmapFiltersAllViz',
    'geomapFiltersAllViz',

    'heatmapFiltersBudgetSlider',
    'barchartFiltersBudgetSlider'
);

// TODO: Instantiate charts with global filter slider

/**
 * Load data from CSV file asynchronously and render charts
 */
Promise.all([
    d3.csv('data/movies-processed1.csv'),
    d3.json('data/topo_countries.json')
]).then(_data => {
  data = _data[0];
  geoData = _data[1];

  let allCountries = []
  geoData.objects.countries.geometries.forEach((d) => {
    allCountries.push(d.properties.name)
  })

  console.log(allCountries)

  updateGeoData(data, geoData)

  // Convert columns to numerical values
  data = data.map(d => {
    Object.keys(d).forEach(attr => {
      if (attr == 'Budget' || attr == 'Income') {
        d[attr] = (d[attr] == 'Unknown' || d[attr] == null) ? null : +d[attr];
      } else if (attr == 'Country_of_origin' || attr == 'Genre' || attr == 'Stars' || attr == "Directors") {
        d[attr] = d[attr].split(',').map(s => s.trim());
      } else if (attr != 'Certificate' && attr != 'Filming_location' && attr != 'Month' && attr != 'Title') {
        d[attr] = +d[attr];
      }
    });
    return d;
  });

  data_filtered = data.filter(d => d.Budget !== null); // if we're using income instead of budget, just change it to income instead 
  newData = data; // Set default for newData

  scatterplot = new ScatterPlot({parentElement: '#scatter-plot',}, data_filtered, dispatcher); // put the filtered data in since we don't want unknowns in the scatterplot
  barchart = new BarChart({parentElement: '#bar-chart',}, data, dispatcher);
  heatmap = new Heatmap({parentElement: '#heatmap',}, data, dispatcher);
  geographic = new Geographic({parentElement: '#geographic-map',}, geoData, dispatcher);

  d3.select('#slider1 #slider2').on('change', function() {
    resetAllData(data, geoData);
    updateAllVis();
  })

}).catch(error => console.error(error));

function getCountForEachFilmLocationCountry(_data) {
   let groupedCountries = d3.groups(_data, d => d.Filming_location);
   let countryCount = {};

   groupedCountries.forEach(([country, movies]) => {
     countryCount[country] = movies.length;
   })

  return countryCount;

}

function updateAllVis() {
  scatterplot.updateVis()
  barchart.updateVis()
  heatmap.updateVis()
  geographic.updateVis()
}

function resetAllData(_data, _geoData) {
  scatterplot.data = _data
  barchart.data = _data
  heatmap.data = _data
  // geographic.data = _geoData
  updateGeoData(_data, _geoData)
}

function heatmapReset() {
  selectedMovies.clear();
  resetAllData(data, geoData);
  updateAllVis();
}

// update the bar chart with all other filters
function updateBarChart() {
  if (!(selectedMovies.size === 0)) {
    heatMapFilterData = data.filter(movie => {
      return (selectedMovies.has(movie.ID))
    })
  } else {
    heatMapFilterData = data
  }
  if (!(selectedCountries.size === 0)) {
    geoMapFilterData = heatMapFilterData.filter(movie => {
      return (selectedCountries.has(movie.Country_of_origin))
    })
  } else {
    geoMapFilterData = heatMapFilterData
  }

  barchart.data = geoMapFilterData;
  barchart.updateVis();
}

// update the scatterplot chart with all other filters
function updateScatterPlot() {
  if (!(selectedMovies.size === 0)) {
    heatMapFilterData = data.filter(movie => {
      return (selectedMovies.has(movie.ID))
    })
  } else {
    heatMapFilterData = data
  }
  if (!(selectedCertificates.size === 0)) {
    barChartFilterData = heatMapFilterData.filter(movie => {
      return (selectedCertificates.has(movie.Certificate))
    })
  } else {
    barChartFilterData = heatMapFilterData
  }
  if (!(selectedCountries.size === 0)) {
    geoMapFilterData = barChartFilterData.filter(movie => {
      return (selectedCountries.has(movie.Country_of_origin))
    })
  } else {
    geoMapFilterData = barChartFilterData
  }

  scatterplot.data = geoMapFilterData;
  scatterplot.updateVis();
}

// update the geographic map chart with all other filters
function updateGeoMap() {
  if (!(selectedMovies.size === 0)) {
    heatMapFilterData = data.filter(movie => {
      return (selectedMovies.has(movie.ID))
    })
  } else {
    heatMapFilterData = data
  }
  if (!(selectedCertificates.size === 0)) {
    barChartFilterData = heatMapFilterData.filter(movie => {
      return (selectedCertificates.has(movie.Certificate))
    })
  } else {
    barChartFilterData = heatMapFilterData
  }

  geographic.data = updateGeoData(barChartFilterData, geoData);
  geographic.updateVis();
}

// update the heatmap chart with all other filters
function updateHeatMap() {
  if (!(selectedCertificates.size === 0)) {
    barChartFilterData = data.filter(movie => {
      return (selectedCertificates.has(movie.Certificate))
    })
  } else {
    barChartFilterData = data
  }
  if (!(selectedCountries.size === 0)) {
    geoMapFilterData = barChartFilterData.filter(movie => {
      return (selectedCountries.has(movie.Country_of_origin))
    })
  } else {
    geoMapFilterData = barChartFilterData
  }

  heatmap.data = geoMapFilterData;
  heatmap.updateVis();

}

dispatcher.on('barchartFiltersAllViz', () => {
  updateHeatMap();
  updateScatterPlot();
  updateGeoMap();
});

// update scatterplot when movies are selected in heatmap
dispatcher.on('heatmapFiltersAllViz', () => {
  updateBarChart();
  updateScatterPlot();
  updateGeoMap();
});

// update all other charts when the geomap is selected
dispatcher.on('geomapFiltersAllViz', () => {
  updateBarChart();
  updateScatterPlot();
  updateHeatMap();
});

function updateGeoData(_data, _geoData) {
  let countryMovieCount = getCountForEachFilmLocationCountry(_data);

  let _countryMovieCount = getCountForEachFilmLocationCountry(_data)
  // console.log("before",countryMovieCount)

  // let numCountries = 0;
  _geoData.objects.countries.geometries.forEach(country => {
    let countryName = country.properties.name

    if (countryName in countryMovieCount) {
      country.properties.count = countryMovieCount[countryName];
      delete _countryMovieCount[countryName]
    } else {
      country.properties.count = 0;
    }
  });
  // console.log("after", _countryMovieCount)
  // console.log('total countries:', numCountries)

  return _geoData
}

/*
Slider:

Get values from sliders when used and update BudgetFilterValues global filter min and max

Code referenced from:
 */

function controlSlider(fromSlider, toSlider) {
  let fromVal = parseFloat(fromSlider.value);
  let toVal = parseFloat(toSlider.value);

  if (fromVal > toVal) {
    BudgetFilterValues.max = fromVal
    BudgetFilterValues.min = toVal
  } else {
    BudgetFilterValues.max = toVal
    BudgetFilterValues.min = fromVal
  }
  parsedValues = fromVal + " ~ " + toVal;
  document.getElementById("sliderValues").value = parsedValues;

  let updatedData = data.filter(movie => {
    return (movie.Budget >= BudgetFilterValues.min && movie.Budget <= BudgetFilterValues.max)
  })

  resetAllData(updatedData, geoData);
  updateAllVis();

}

const fromSlider = document.querySelector('#slider1');
const toSlider = document.querySelector('#slider2');

fromSlider.oninput = () => controlSlider(fromSlider, toSlider);
toSlider.oninput = () => controlSlider(fromSlider, toSlider);
