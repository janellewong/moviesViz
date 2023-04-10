// Global filters
let data, data_filtered, geoData;

let BudgetFilterValues = {
  min: 10,
  max: 356000000
};

// ID of movies selected in heatmap
let selectedMovies = new Set();

// certificates selected from barchart as string
let selectedCertificates = new Set();

const dispatcher = d3.dispatch(
    'barchartFiltersScatterPlot',
    'barchartFiltersHeatmap',

    'heatmapFiltersBarchart',
    'heatmapFiltersScatterAndBar',

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

  updateGeoData(data)

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

// update scatterplot when movies are selected in heatmap
dispatcher.on('heatmapFiltersScatterAndBar', () => {
  if (!(selectedMovies.size === 0)) {
    let newData = data.filter(movie => {
      return selectedMovies.has(movie.ID)
    })
    scatterplot.data = newData
    barchart.data = newData
  }
  else {
    scatterplot.data = data;
    barchart.data = data;
  }
  scatterplot.updateVis();
  barchart.updateVis();
});

function updateGeoData(_data) {
  let countryMovieCount = getCountForEachFilmLocationCountry(_data);

  let _countryMovieCount = getCountForEachFilmLocationCountry(_data)

  console.log("before",countryMovieCount)

  // let numCountries = 0;
  geoData.objects.countries.geometries.forEach(country => {
    let countryName = country.properties.name

    if (countryName in countryMovieCount) {
      country.properties.count = countryMovieCount[countryName];
      delete _countryMovieCount[countryName]
      // console.log('Country: ', country.properties.name)
      // console.log('count: ', country.properties.count)
    } else {
      country.properties.count = 0;
    }
  });
  console.log("after", _countryMovieCount)
  // console.log('total countries:', numCountries)
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


/*
Slider:

Get values from sliders when used and update BudgetFilterValues global filter min and max

Code referenced from:
 */

function controlSlider(fromSlider, toSlider) {
  let fromVal = fromSlider.value
  let toVal = toSlider.value

  if (fromVal > toVal) {
    BudgetFilterValues.max = fromVal
    BudgetFilterValues.min = toVal
  } else {
    BudgetFilterValues.max = toVal
    BudgetFilterValues.min = fromVal
  }

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
