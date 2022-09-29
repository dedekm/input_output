const five = require("johnny-five");

var board = new five.Board({ repl: false });

board.on("ready", function() {
  var sensors = {
    red: {
      value: 0,
      count: 0
    },
    // green: {
    //   value: 0,
    //   count: 0
    // },
    // blue: {
    //   value: 0,
    //   count: 0
    // },
    door: {
      value: 0,
      count: 0
    },
    // chair: {
    //   value: 0,
    //   count: 0
    // },
  }

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
  });
});
