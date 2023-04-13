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
  data = data_filtered;

  scatterplot = new ScatterPlot({parentElement: '#scatter-plot',}, data_filtered, dispatcher);
  barchart = new BarChart({parentElement: '#bar-chart',}, data, dispatcher);
  heatmap = new Heatmap({parentElement: '#heatmap',}, data, dispatcher);
  geographic = new Geographic({parentElement: '#geographic-map',}, geoData, dispatcher);

  d3.select('#slider1 #slider2').on('change', function() {
    resetAllData(data, geoData, data_filtered);
    updateBarChart();
    updateScatterPlot();
    updateGeoMap();
    updateHeatMap();
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
  updateGeoData(_data, _geoData)
}

function movieReset() {
  selectedMovies.clear();
  selectedCertificates.clear();
  selectedCountries.clear();
  resetSliders();
  heatmap.updateVis();
}

function resetSliders() {
  controlSlider(0, 356000000);
  document.getElementById("slider1").value = 0;
  document.getElementById("slider2").value = 356000000;
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

function performSliderFilter(_data) {
  sliderFilterData = _data.filter(movie => {
    return (movie.Budget >= BudgetFilterValues.min && movie.Budget <= BudgetFilterValues.max)
  });

  return sliderFilterData;
}

// update the bar chart with all other filters
function updateBarChart() {
  data01 = performHeatMapFilter(data);
  data02 = performGeoMapFilter(data01);
  data03 = performSliderFilter(data02);

  barchart.data = data03;
  barchart.updateVis();
}

// update the scatterplot chart with all other filters
function updateScatterPlot() {
  data01 = performHeatMapFilter(data);
  data02 = performBarChartFilter(data01);
  data03 = performGeoMapFilter(data02);
  data04 = performSliderFilter(data03);

  scatterplot.data = data04;
  scatterplot.updateVis();
}

// update the geographic map chart with all other filters
function updateGeoMap() {
  data01 = performHeatMapFilter(data);
  data02 = performBarChartFilter(data01);
  data03 = performSliderFilter(data02);

  geographic.data = updateGeoData(data03, geoData);
  geographic.updateVis();
}

// update the heatmap chart with all other filters
function updateHeatMap() {
  data01 = performBarChartFilter(data);
  data02 = performGeoMapFilter(data01);
  data03 = performSliderFilter(data02);

  heatmap.data = data03;
  heatmap.updateVis();
}

// update all other charts when the barchart is selected
dispatcher.on('barchartFiltersAllViz', () => {
  updateScatterPlot();
  updateGeoMap();
});

// update all other charts when in heatmap is selected
dispatcher.on('heatmapFiltersAllViz', () => {
  updateBarChart();
  updateScatterPlot();
  updateGeoMap();
});

// update all other charts when the geomap is selected
dispatcher.on('geomapFiltersAllViz', () => {
  updateBarChart();
  updateScatterPlot();
});

function updateGeoData(_data, _geoData) {
  let countryMovieCount = getCountForEachFilmLocationCountry(_data);

  let _countryMovieCount = getCountForEachFilmLocationCountry(_data)
  _geoData.objects.countries.geometries.forEach(country => {
    let countryName = country.properties.name

    if (countryName in countryMovieCount) {
      country.properties.count = countryMovieCount[countryName];
      delete _countryMovieCount[countryName]
    } else {
      country.properties.count = 0;
    }
  });
  return _geoData
}

/*
Slider:

Get values from sliders when used and update BudgetFilterValues global filter min and max

Code referenced from:
 */

function controlSlider(fromSliderValue, toSliderValue) {
  let fromVal = parseFloat(fromSliderValue);
  let toVal = parseFloat(toSliderValue);

  if (fromVal > toVal) {
    BudgetFilterValues.max = fromVal
    BudgetFilterValues.min = toVal
  } else {
    BudgetFilterValues.max = toVal
    BudgetFilterValues.min = fromVal
  }
  parsedValues = "$" + fromVal + " ~ " + "$" + toVal;
  document.getElementById("sliderValues").value = parsedValues;

  updateBarChart();
  updateScatterPlot();
  updateGeoMap();
}

const fromSlider = document.querySelector('#slider1');
const toSlider = document.querySelector('#slider2');

fromSlider.oninput = () => controlSlider(fromSlider.value, toSlider.value);
toSlider.oninput = () => controlSlider(fromSlider.value, toSlider.value);
