// Global filters
let data, data_filtered;

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
d3.csv('data/movies-processed.csv')
  .then(_data => {
  data = _data;
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
  geographic = new Geographic({parentElement: '#geographic-map',}, data, dispatcher);

  d3.select('#slider1 #slider2').on('change', function() {
    resetAllData(data);
    updateAllVis();
  })

}).catch(error => console.error(error));


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


function resetAllData(_data) {
  scatterplot.data = _data
  barchart.data = _data
  heatmap.data = _data
  geographic.data = _data
}

function heatmapReset() {
  selectedMovies.clear();
  resetAllData(data);
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

  resetAllData(updatedData);
  updateAllVis();

}

const fromSlider = document.querySelector('#slider1');
const toSlider = document.querySelector('#slider2');

fromSlider.oninput = () => controlSlider(fromSlider, toSlider);
toSlider.oninput = () => controlSlider(fromSlider, toSlider);


