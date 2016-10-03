const url = location.hostname;
const conn = new WebSocket(`ws://${url}:81/`, ['arduino']);

const sendRGB = debounce((hex) => {
  conn.send(hex);
  console.log('send', hex)
}, 500);

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    const later = function() {
      timeout = null;
      if(!immediate) {
        func.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if(callNow) {
      func.apply(context, args);
    }
  };
}

const utils = {
  parse: (colorValue) => {
    let value = parseInt(colorValue).toString(16)
    if(value.length < 2) {
      value = '0' + value;
    }
    return value;
  },
  updateHexColor: (colors) => {
    const r = utils.parse(colors.red);
    const g = utils.parse(colors.green);
    const b = utils.parse(colors.blue);
    return `#${r}${g}${b}`;
  },
  hexSplit: (hexColor) => {
    return [1,3,5].map(function(o) {
      return parseInt(hexColor.slice(o, o + 2), 16);
    });
  },
  getLuma: (hex) => {
    const colors = utils.hexSplit(hex);
    const r = colors[0];
    const g = colors[1];
    const b = colors[2];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
};

const offState = {
  red: 0,
  green: 0,
  blue: 0,
  hex: '#000000'
}

const setColors = {
  Fuchsia: '#FF00FF',
  DeepPink: '#FF1493',
  DarkViolet: '#9400D3',
  DarkTurquoise: '#00CED1',
  DarkOrchid: '#9932CC',
  DarkBlue: '#00008B',
  Crimson: '#DC143C',
  Cyan: '#00FFFF',
  Chartreuse: '#7FFF00',
  Blue: '#0000FF',
  Aqua: '#00FFFF',
  HotPink: '#FF69B4',
  Purple: '#800080',
  Violet: '#EE82EE',
  Yellow: '#FFFF00',
  Gold: '#ffd700',
  RebeccaPurple: '#663399'
};

const Slider = function({color, colorValue, handleSliderColorChange}) {
  return (
    <div className="slide">{color}:
      <input id={color[0]} name={color} className="slider" type="range" min="0" max="255" step="1" onChange={handleSliderColorChange} value={colorValue} />
    </div>
  );
};

const SetColors = function({handleColorChange}) {
  return (
    <div className="setColors">
      {Object.keys(setColors).map(function(color, i) {
        const colorHex = setColors[color];
        const hexStyle = {
          background: colorHex,
          color: (utils.getLuma(colorHex) < 100) ? '#fff' : '#000'
        };
        return (<button key={i} style={hexStyle} onClick={handleColorChange.bind(null, colorHex)}>{color}</button>);
      })}
    </div>
  );
};

const App = React.createClass({
  getInitialState() {
    return offState;
  },
  handleError(err) {
    console.log('Error ', error);
  },
  componentWillMount() {
    conn.onopen = () => {
      conn.send('Connect ' + new Date());
    };

    conn.onerror = (error) => {
      this.handleError(error);
    };

    conn.onmessage = (e) => {
      this.handleColor(e.data)
    };
  },
  handleColor(data) {
    // get color from the server and
    // update values on slider and color display
    const rgb = data.split(',');
    console.log('Server: ', rgb);
    const colors = {
      red: rgb[0],
      green: rgb[1],
      blue: rgb[2],
    };
    colors.hex = utils.updateHexColor(colors);
    console.log('colorUpdate', colors);
    this.setState(colors);
  },
  handleOff() {
    sendRGB(offState.hex);
  },
  handleSliderColorChange(e) {
    const state = this.state;
    const target = e.target;
    let color = {};
    color[target.name] = target.value;
    const colors = Object.assign({}, state, color);
    colors.hex = utils.updateHexColor(colors);
    console.log('handleSliderColorChange', colors);
    sendRGB(colors.hex);
  },
  handleColorChange(hexColor) {
    console.log('handleColorChange', hexColor);
    sendRGB(hexColor);
  },
  render() {
    const hex = this.state.hex;
    const showHexColor = hex === '#000000' ? 'Color Display' : hex;
    const hexStyle = {
      background: hex,
      color: (utils.getLuma(hex) < 100) ? '#fff' : '#000'
    };
    return (
      <div className="app">
        <h1>LED Control</h1>
        <button className="off-btn" onClick={this.handleOff}>Off</button>
        <Slider color="red" colorValue={this.state.red} handleSliderColorChange={this.handleSliderColorChange}/>
        <Slider color="green" colorValue={this.state.green} handleSliderColorChange={this.handleSliderColorChange}/>
        <Slider color="blue" colorValue={this.state.blue} handleSliderColorChange={this.handleSliderColorChange}/>
        <div style={hexStyle} className="color">{showHexColor}</div>
        <SetColors handleColorChange={this.handleColorChange}/>
      </div>
    );
  }
});

ReactDOM.render(
  <App/>,
  document.querySelector('.container')
);
