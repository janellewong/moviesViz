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

  data_filtered = data.filter(d => d.Budget !== null);
  newData = data; // Set default for newData

  scatterplot = new ScatterPlot({parentElement: '#scatter-plot',}, data_filtered, dispatcher); // put the filtered data in since we don't want unknowns in the scatterplot
  barchart = new BarChart({parentElement: '#bar-chart',}, data, dispatcher);
  heatmap = new Heatmap({parentElement: '#heatmap',}, data, dispatcher);
  geographic = new Geographic({parentElement: '#geographic-map',}, geoData, dispatcher);

  d3.select('#slider1 #slider2').on('change', function() {
    resetAllData(data, geoData, data_filtered);
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

function resetAllData(_data, _geoData, _scatterplotData) {
  scatterplot.data = _scatterplotData
  barchart.data = _data
  heatmap.data = _data
  // geographic.data = _geoData
  updateGeoData(_data, _geoData)
}

function movieReset() {
  selectedMovies.clear();
  resetAllData(data, geoData, data_filtered);
  updateAllVis();
}

// Filters input data to match selection in Heatmap
function performHeatMapFilter(_data) {
  if (!(selectedMovies.size === 0)) {
    heatMapFilterData = _data.filter(movie => {
      return (selectedMovies.has(movie.ID))
    })
  } else {
    heatMapFilterData = _data
  }
  return heatMapFilterData
}

// Filters input data to match selection in the Bar Chart
function performBarChartFilter(_data) {
  if (!(selectedCertificates.size === 0)) {
    barChartFilterData = _data.filter(movie => {
      return (selectedCertificates.has(movie.Certificate))
    })
  } else {
    barChartFilterData = _data
  }
  return barChartFilterData
}

// Filters input data to match selection in Geographic Map
function performGeoMapFilter(_data) {
  if (!(selectedCountries.size === 0)) {
    geoMapFilterData = _data.filter(movie => {
      return (selectedCountries.has(movie.Filming_location))
    });
  } else {
    geoMapFilterData = _data;
  }
  return geoMapFilterData;
}

// update the bar chart with all other filters
function updateBarChart() {
  data01 = performHeatMapFilter(data);
  data02 = performGeoMapFilter(data01)

  barchart.data = data02;
  barchart.updateVis();
}

// update the scatterplot chart with all other filters
function updateScatterPlot() {
  data01 = performHeatMapFilter(data);
  data02 = performBarChartFilter(data01);
  data03 = performGeoMapFilter(data02);

  scatterplot.data = data03;
  scatterplot.updateVis();
}

// update the geographic map chart with all other filters
function updateGeoMap() {
  data01 = performHeatMapFilter(data);
  data02 = performBarChartFilter(data01);

  geographic.data = updateGeoData(data02, geoData);
  geographic.updateVis();
}

// update the heatmap chart with all other filters
function updateHeatMap() {
  data01 = performBarChartFilter(data);
  data02 = performGeoMapFilter(data01);

  heatmap.data = data02;
  heatmap.updateVis();
}

// update all other charts when the barchart is selected
dispatcher.on('barchartFiltersAllViz', () => {
  // updateHeatMap();
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
  // updateHeatMap();
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

  let scatterData = updatedData.filter(d => d.Budget !== null);

  resetAllData(updatedData, geoData, scatterData);
  updateAllVis();

}

const fromSlider = document.querySelector('#slider1');
const toSlider = document.querySelector('#slider2');

fromSlider.oninput = () => controlSlider(fromSlider, toSlider);
toSlider.oninput = () => controlSlider(fromSlider, toSlider);
