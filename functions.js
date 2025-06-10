const distanceSelect = document.getElementById('distance');
const distanceFilter = document.getElementById('distanceFilter');
const timeInput = document.getElementById('time');
const weightStone = document.getElementById('weightStone');
const weightPounds = document.getElementById('weightPounds');
const form = document.getElementById('entryForm');

function populateDropdowns() {
  for (let i = 1; i <= 43; i++) {
    const opt = new Option(`${i} km`, i);
    distanceSelect.appendChild(opt.cloneNode(true));
    distanceFilter.appendChild(opt);
  }
  const cachedDistance = localStorage.getItem('selectedDistance');
  if (cachedDistance) distanceFilter.value = cachedDistance;
}

function toggleForm() {
  const container = document.getElementById('form-container');
  container.classList.toggle('active');
  document.getElementById('date').valueAsDate = new Date();

  // Autofill cached weight if available
  const cachedWeight = localStorage.getItem('cachedWeight');
  if (cachedWeight) {
    const [stone, pounds] = cachedWeight.split(':');
    weightStone.value = stone;
    weightPounds.value = pounds;
  }
  // Autofill cached time if available
  const cachedTime = localStorage.getItem('cachedTime');
  if (cachedTime) {
    timeInput.value = cachedTime;
  }
  // Autofill cached distance if available
  const cachedDistance = localStorage.getItem('selectedDistance');
  if (cachedDistance) {
    distanceSelect.value = cachedDistance;
  }
}

// Auto-insert ":" after 2 digits in time input
timeInput.addEventListener('input', function (e) {
  let val = timeInput.value.replace(/[^0-9:]/g, '');
  if (val.length === 2 && !val.includes(':')) {
    val = val + ':';
  }
  // Prevent more than 2 digits before colon
  if (val.length > 5) val = val.slice(0, 5);
  timeInput.value = val;
  // Cache time as user types
  localStorage.setItem('cachedTime', val);
});

function addEntry(event) {
  event.preventDefault();
  const data = JSON.parse(localStorage.getItem('runData') || '[]');
  const entry = {
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    weight: `${weightStone.value}:${weightPounds.value}`,
    distance: +document.getElementById('distance').value
  };
  data.push(entry);
  localStorage.setItem('runData', JSON.stringify(data));
  // Cache weight for next time
  localStorage.setItem('cachedWeight', `${weightStone.value}:${weightPounds.value}`);
  // Cache time for next time
  localStorage.setItem('cachedTime', document.getElementById('time').value);
  // Cache distance for next time
  localStorage.setItem('selectedDistance', document.getElementById('distance').value);
  form.reset();
  toggleForm();
  renderChart();
}

function parseTimeToSeconds(timeStr) {
  const [min, sec] = timeStr.split(':').map(Number);
  return min * 60 + sec;
}

function parseWeightToLbs(weightStr) {
  const [stone, pounds] = weightStr.split(':').map(Number);
  return stone * 14 + pounds;
}

function cacheDistanceSelection() {
  localStorage.setItem('selectedDistance', distanceFilter.value);
}

// Helper to format date as "DD Mon YYYY"
function formatDateLabel(dateStr) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getFullYear()}-${months[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTimeLabel(seconds) {
  // Converts seconds to MM:SS
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function renderChart() {
  const ctx = document.getElementById('chart').getContext('2d');
  const data = JSON.parse(localStorage.getItem('runData') || '[]');
  const selectedDistance = +distanceFilter.value;

  const filtered = data.filter(d => d.distance === selectedDistance);
  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Format labels as "YYYY-Mon-DD"
  const labels = filtered.map(d => formatDateLabel(d.date));
  const times = filtered.map(d => parseTimeToSeconds(d.time));
  const weights = filtered.map(d => parseWeightToLbs(d.weight));

  // Find fastest time (minimum seconds)
  let fastestTime = null;
  if (times.length > 0) {
    const minTime = Math.min(...times);
    fastestTime = formatTimeLabel(minTime);
  }

  // Update the header
  const fastestHeader = document.getElementById('fastest-header');
  if (fastestTime) {
    fastestHeader.textContent = `Fastest time for ${selectedDistance} km: ${fastestTime}`;
  } else {
    fastestHeader.textContent = '';
  }

  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Time (s)',
          data: times,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          yAxisID: 'y',
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Weight (lbs)',
          data: weights,
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          yAxisID: 'y1',
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Run Performance for ${selectedDistance} km`
        },
        tooltip: {
          callbacks: {
            title: function (context) {
              return context[0].label;
            },
            label: function (context) {
              if (context.dataset.label === 'Time (s)') {
                return 'Time: ' + formatTimeLabel(context.parsed.y);
              }
              if (context.dataset.label === 'Weight (lbs)') {
                const stone = Math.floor(context.parsed.y / 14);
                const pounds = Math.round(context.parsed.y % 14);
                return `Weight: ${stone} st ${pounds} lbs`;
              }
              return context.dataset.label + ': ' + context.parsed.y;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          title: { display: true, text: 'Date' }
        },
        y: {
          beginAtZero: false,
          title: { display: true, text: 'Time (MM:SS)' },
          ticks: {
            callback: function(value) {
              const min = Math.floor(value / 60);
              const sec = value % 60;
              return `${min}:${sec.toString().padStart(2, '0')}`;
            }
          }
        },
        y1: {
          beginAtZero: false,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Weight (st lbs)' },
          ticks: {
            callback: function(value) {
              // Only show labels for actual weights in the data
              const uniqueWeights = Array.from(new Set(weights));
              if (!uniqueWeights.includes(value)) return '';
              const stone = Math.floor(value / 14);
              const pounds = Math.round(value % 14);
              return `${stone} st ${pounds} lbs`;
            }
          }
        }
      }
    }
  });
}