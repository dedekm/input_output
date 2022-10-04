const { execSync } = require("child_process");
const five = require("johnny-five");
const fs = require('fs');
const path = require('path');

const saveFilePath = path.join(__dirname, 'data/save.json');

// config
const readVolumeDecrease = 15,
      readingPause = 60,
      entryPin = 2,
      chairPin = 3,
      redPin = 5,
      greenPin = 6,
      bluePin = 7;

var cycle = 0,
    sensors,
    audioFiles;

function saveSensorValue(key, value) {
  if(sensors[key].value != value) {
    sensors[key].value = value;

    if(sensors[key].value == 1) {
      sensors[key].currentCount++;
      sensors[key].totalCount++;
    }
  }
}

function resetSensors() {
  for (var key in sensors) {
    sensors[key].value = 0;
    sensors[key].currentCount = 0;
  }
}

function delay(seconds) {
  const startPoint = new Date().getTime()
  console.log(">> waiting for " + String(seconds) + " seconds");
  while (new Date().getTime() - startPoint <= seconds * 1000) {}
}

function read(value) {
  console.log(">> reading " + String(value));
  execSync("amixer -D pulse sset Master " + String(readVolumeDecrease) + "%-")
  execSync("echo '" + String(value) + "' | festival --tts");
  execSync("amixer -D pulse sset Master " + String(readVolumeDecrease) + "%+")
}

function playFile(filepath) {
  console.log(">> playing " + filepath);
  execSync('play ' + filepath, { stdio: "pipe" })
}

var countingFilenames = {
  current: {
    red: "'Počet interakcí bodu červená.mp3'",
    green: "'Počet interakcí bodu zelená.mp3'",
    blue: "'Počet interakcí bodu modrá.mp3'",
    entry: "'Počet interakcí bodu vstup.mp3'",
    chair: "'Počet interakcí bodu židle.mp3'",
  },
  total: {
    red: "'Celkový počet interakcí bodu červená.mp3'",
    green: "'Celkový počet interakcí bodu zelená.mp3'",
    blue: "'Celkový počet interakcí bodu modrá.mp3'",
    entry: "'Celkový počet interakcí bodu vstup.mp3'",
    chair: "'Celkový počet interakcí bodu židle.mp3'",
  }
}

for (var h in countingFilenames) {
  for (var key in countingFilenames[h]) {
    countingFilenames[h][key] = path.join(__dirname, "audio/counting", countingFilenames[h][key]);
  }
}

function readCounts(callback) {
  for (var key in countingFilenames.current) {
    playFile(countingFilenames.current[key])
    delay(0.3);
    read(sensors[key].currentCount)
    delay(0.3);
  }

  for (var key in countingFilenames.total) {
    playFile(countingFilenames.total[key])
    delay(0.3);
    read(sensors[key].totalCount)
    delay(0.3);
  }
}

function selectAudioKey() {
  var activated = 0;
  for (var key in sensors) {
    if (sensors[key].currentCount > 0) {
      activated++;
    }
  }

  if (activated == 5 || (activated == 4 && sensors["entry"].currentCount == 0)) {
    return "all"
  } else if (activated == 0) {
    return "nothing"
  } else if (activated == 1 && sensors["entry"].currentCount > 0) {
    return "only_entry"
  } else {
    return "other"
  }
}

function loadAudio() {
  audioFiles = {}

  for (var key of ["all", "nothing", "only_entry", "other"]) {
    var files = [];
    var audioFolderPath = path.join(__dirname, "audio", key);
    fs.readdirSync(audioFolderPath).forEach(function (file) {
      if (/.*\.mp3$/.test(file)) {
        files.push(path.join(audioFolderPath, file));
      }
    });

    audioFiles[key] = {
      index: 0,
      files: files
    }
  }

  console.log("audio files loaded!");
  console.log(audioFiles);
  console.log("---");
}

function playAudio() {
  var key = selectAudioKey();
  var filepath = audioFiles[key].files[audioFiles[key].index];

  playFile(filepath);

  audioFiles[key].index++;
  if (audioFiles[key].index >= audioFiles[key].files.length) {
    audioFiles[key].index = 0;
  }
}

function loadSensors() {
  if (fs.existsSync(saveFilePath)) {
    let rawdata = fs.readFileSync(saveFilePath);
    sensors = JSON.parse(rawdata);
    resetSensors();

    console.log('save file loaded!');
  } else {
    sensors = {};

    for (var key of ["red", "green", "blue", "entry", "chair"]) {
      sensors[key] = {
        value: 0,
        currentCount: 0,
        totalCount: 0
      };
    }

    console.log('no save file found, using default values!');
  }

  console.log(sensors);
  console.log("---");
}

function playCycle() {
  switch (cycle) {
    case 0:
      console.log("cycle 1: waiting for inputs (" + String(readingPause) + " seconds)");
      setTimeout(nextCycle, readingPause * 1000)
      break;
    case 1:
      console.log("cycle 2: reading out interaction counts");
      readCounts();
      delay(1);
      nextCycle()
      break;
    case 2:
      console.log("cycle 3: playing a selected file");
      playAudio();
      resetSensors();

      fs.writeFileSync(saveFilePath, JSON.stringify(sensors));

      nextCycle()
      break;
  }
}

function nextCycle() {
  if (cycle == 2) {
    cycle = 0;
  } else {
    cycle++;
  }

  playCycle();
}

loadAudio()
loadSensors()
resetSensors()

if (process.env.PRODUCTION) {
  console.log("running in production enviroment");
  delay(5);
  read("Startuji program");
  console.log("---");
}

var board = new five.Board({ repl: false });

board.on("ready", function() {
  // laser sensor
  var sensorPin = new five.Pin(entryPin);
  sensorPin.read(function(error, value) {
    saveSensorValue("entry", value ^ 1)
  });

  // IR proximity sensor
  sensorPin = new five.Pin(chairPin);
  sensorPin.read(function(error, value) {
    saveSensorValue("chair", value ^ 1)
  });

  // PIR motion sensors
  sensorPin = new five.Pin(redPin);
  sensorPin.read(function(error, value) {
    saveSensorValue("red", value)
  });

  sensorPin = new five.Pin(greenPin);
  sensorPin.read(function(error, value) {
    saveSensorValue("green", value)
  });

  sensorPin = new five.Pin(bluePin);
  sensorPin.read(function(error, value) {
    saveSensorValue("blue", value)
  });

  this.loop(2000, function() {
    console.log(">>> reading values");
    console.log(sensors);
  });

  playCycle();
});
