const five = require("johnny-five");
const fs = require('fs');
const path = require('path');

const saveFilePath = path.join(__dirname, '/data/save.json');

var board = new five.Board({ repl: false });

board.on("ready", function() {

  function saveSensorValue(key, value) {
    if(sensors[key].value != value) {
      sensors[key].value = value;

      if(sensors[key].value == 1) {
        sensors[key].count++;
      }
    }
  }

  var doorSensor = new five.Pin(2);
  doorSensor.read(function(error, value) {
    saveSensorValue("door", value ^ 1)
  });

  this.loop(2000, function() {
    // read(sensors.red.value);

    console.log("door");
    console.log("current value: " + String(sensors.door.value));
    console.log("total count: " + String(sensors.door.count));
    console.log("---");

    fs.writeFileSync(saveFilePath, JSON.stringify(sensors));
  });
});

var sensors;

if (fs.existsSync(saveFilePath)) {
  let rawdata = fs.readFileSync(saveFilePath);
  sensors = JSON.parse(rawdata);

  for (var key in sensors) {
    sensors[key].value = 0;
  };

  console.log('save file loaded!');
} else {
  sensors = {};

  for (var key of ["red", "green", "blue", "door", "chair"]) {
    sensors[key] = {
      value: 0,
      count: 0
    };
  };

  console.log('no save file found, using default values!');
}

console.log(sensors);
